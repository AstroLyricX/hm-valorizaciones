import {
	type AlmacenKv,
	atenderMensaje,
	avisarPendientes,
	type ContratoAviso,
	type Entorno,
	hoyEnLima,
	manejarSolicitud,
	mensajePendientes,
	pendientes,
	validarContratos,
} from "../../worker/avisos/src/avisos";

const HOY = "2026-10-19";
const ORIGEN = "https://astrolyricx.github.io";

function contrato(cambios: Partial<ContratoAviso> = {}): ContratoAviso {
	return {
		id: "c-1",
		codigo: "CTR-002",
		proyecto: "OSUR",
		cliente: "ANDINA SAC",
		fechaFin: "2026-10-22",
		periodo: "Octubre 2026",
		pendiente: true,
		...cambios,
	};
}

function almacen(inicial: Record<string, unknown> = {}) {
	const datos = new Map(
		Object.entries(inicial).map(([clave, valor]) => [clave, JSON.stringify(valor)]),
	);

	const kv = {
		get: jest.fn(async (clave: string) => {
			const valor = datos.get(clave);

			return Promise.resolve(valor === undefined ? null : (JSON.parse(valor) as unknown));
		}),
		put: jest.fn(async (clave: string, valor: string) => {
			datos.set(clave, valor);
			await Promise.resolve();
		}),
	} satisfies AlmacenKv;

	return { ...kv, datos };
}

function entorno(kv = almacen()): Entorno & { AVISOS: ReturnType<typeof almacen> } {
	return {
		AVISOS: kv,
		TELEGRAM_TOKEN: "token-de-prueba",
		TELEGRAM_WEBHOOK_SECRET: "secreto-webhook",
		INVITACION: "hm2026",
		ORIGENES: `http://localhost:3000,${ORIGEN}`,
		APP_URL: "https://astrolyricx.github.io/hm-valorizaciones/",
	};
}

// Mensajes enviados a Telegram: chat y texto.
let enviados: { chat_id: number; text: string }[];
let estadoTelegram: (chatId: number) => number;

beforeEach(() => {
	enviados = [];
	estadoTelegram = () => 200;
	global.fetch = jest.fn(async (_url: string | URL | Request, opciones?: RequestInit) => {
		const cuerpo = JSON.parse(String(opciones?.body)) as { chat_id: number; text: string };
		enviados.push({ chat_id: cuerpo.chat_id, text: cuerpo.text });

		return Promise.resolve(new Response("{}", { status: estadoTelegram(cuerpo.chat_id) }));
	}) as typeof fetch;
});

function mensaje(chatId: number, text: string) {
	return { message: { text, chat: { id: chatId, first_name: "Ana" } } };
}

describe("contratos pendientes", () => {
	it("avisa los que vencen en 7 días o menos sin su última valorización", () => {
		const lista = [
			contrato({ codigo: "CTR-001", fechaFin: "2026-10-26" }),
			contrato({ codigo: "CTR-002", fechaFin: "2026-10-20" }),
			contrato({ codigo: "CTR-003", fechaFin: "2026-10-27" }),
			contrato({ codigo: "CTR-004", pendiente: false }),
			contrato({ codigo: "CTR-005", fechaFin: "2026-10-18" }),
		];

		expect(pendientes(lista, HOY).map((item) => item.codigo)).toEqual(["CTR-002", "CTR-001"]);
	});

	it("arma un solo mensaje con todos", () => {
		expect(mensajePendientes([contrato()], HOY)).toBe(
			[
				"⚠️ H&M: 1 contrato vence sin su última valorización",
				"",
				"• CTR-002 · OSUR",
				"  ANDINA SAC",
				"  vence en 3 días (22/10/2026) · falta valorizar Octubre 2026",
				"",
				"Genera la valorización antes del vencimiento.",
			].join("\n"),
		);
	});

	it("usa la fecha de Lima", () => {
		expect(hoyEnLima(new Date("2026-10-20T03:00:00Z"))).toBe("2026-10-19");
		expect(hoyEnLima(new Date("2026-10-20T12:00:00Z"))).toBe("2026-10-20");
	});

	it("rechaza datos con otra forma", () => {
		expect(validarContratos({ contratos: [contrato()] })).toEqual([contrato()]);
		expect(validarContratos({ contratos: [{ ...contrato(), codigo: "<b>" }] })).toBeNull();
		expect(validarContratos({ contratos: [{ ...contrato(), fechaFin: "mañana" }] })).toBeNull();
		expect(validarContratos({ contratos: [{ ...contrato(), pendiente: "si" }] })).toBeNull();
		expect(validarContratos({})).toBeNull();
	});
});

describe("subir contratos", () => {
	const subir = async (env: Entorno, cuerpo: unknown, origen: string | null = ORIGEN) =>
		manejarSolicitud(
			new Request("https://hm-avisos.test/contratos", {
				method: "PUT",
				headers: { "Content-Type": "application/json", ...(origen ? { Origin: origen } : {}) },
				body: JSON.stringify(cuerpo),
			}),
			env,
		);

	it("guarda los contratos que sube la app", async () => {
		const env = entorno();
		const respuesta = await subir(env, { contratos: [contrato()] });

		expect(respuesta.status).toBe(204);
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEN);
		expect(JSON.parse(env.AVISOS.datos.get("contratos") ?? "")).toEqual([contrato()]);
	});

	it("solo acepta la app y datos válidos", async () => {
		const env = entorno();

		expect((await subir(env, { contratos: [] }, "https://otro.com")).status).toBe(403);
		expect((await subir(env, { contratos: [] }, null)).status).toBe(403);
		expect((await subir(env, { contratos: "x" })).status).toBe(400);
		expect(env.AVISOS.put).not.toHaveBeenCalled();
	});
});

describe("bot de Telegram", () => {
	const webhook = async (env: Entorno, cuerpo: unknown, secreto = "secreto-webhook") =>
		manejarSolicitud(
			new Request("https://hm-avisos.test/telegram", {
				method: "POST",
				headers: { "X-Telegram-Bot-Api-Secret-Token": secreto },
				body: JSON.stringify(cuerpo),
			}),
			env,
		);

	it("solo atiende a Telegram (con el secreto del webhook)", async () => {
		expect((await webhook(entorno(), mensaje(1, "/start hm2026"), "otro")).status).toBe(401);
		expect(enviados).toEqual([]);
	});

	it("suscribe con el enlace de invitación y no sin él", async () => {
		const env = entorno();

		await webhook(env, mensaje(1, "/start"));
		await webhook(env, mensaje(2, "/start hm2026"));

		expect(enviados[0]).toMatchObject({ chat_id: 1, text: expect.stringContaining("invitación") });
		expect(enviados[1]).toMatchObject({ chat_id: 2, text: expect.stringMatching(/^Listo/) });
		expect(JSON.parse(env.AVISOS.datos.get("suscriptores") ?? "")).toEqual([
			{ chatId: 2, nombre: "Ana", desde: expect.any(String) },
		]);
	});

	it("un suscrito ve los pendientes y puede darse de baja", async () => {
		const env = entorno(
			almacen({
				contratos: [contrato()],
				suscriptores: [{ chatId: 2, nombre: "Ana", desde: HOY }],
			}),
		);

		await atenderMensaje(env, mensaje(2, "/pendientes"), HOY);
		await atenderMensaje(env, mensaje(3, "/pendientes"), HOY);
		await atenderMensaje(env, mensaje(2, "/salir"), HOY);

		expect(enviados[0].text).toContain("CTR-002 · OSUR");
		expect(enviados[1]).toMatchObject({ chat_id: 3, text: expect.stringContaining("invitación") });
		expect(JSON.parse(env.AVISOS.datos.get("suscriptores") ?? "")).toEqual([]);
	});
});

describe("aviso diario", () => {
	it("avisa a todos los suscritos y quita a quien bloqueó el bot", async () => {
		const env = entorno(
			almacen({
				contratos: [contrato()],
				suscriptores: [
					{ chatId: 1, nombre: "Ana", desde: HOY },
					{ chatId: 2, nombre: "Luis", desde: HOY },
				],
			}),
		);
		estadoTelegram = (chatId) => (chatId === 2 ? 403 : 200);

		expect(await avisarPendientes(env, HOY)).toBe(1);
		expect(enviados.map((enviado) => enviado.chat_id)).toEqual([1, 2]);
		expect(JSON.parse(env.AVISOS.datos.get("suscriptores") ?? "")).toEqual([
			{ chatId: 1, nombre: "Ana", desde: HOY },
		]);
	});

	it("sin pendientes no manda nada", async () => {
		const env = entorno(
			almacen({
				contratos: [contrato({ pendiente: false })],
				suscriptores: [{ chatId: 1, nombre: "Ana", desde: HOY }],
			}),
		);

		expect(await avisarPendientes(env, HOY)).toBe(0);
		expect(enviados).toEqual([]);
	});
});

describe("instalación", () => {
	it("registra el webhook con el secreto y devuelve el enlace de invitación", async () => {
		const llamadas: string[] = [];
		global.fetch = jest.fn(async (url: string | URL | Request) => {
			llamadas.push(String(url).split("/").pop() ?? "");

			return Promise.resolve(Response.json({ ok: true, result: { username: "hm_avisos_bot" } }));
		}) as typeof fetch;
		const instalar = async (clave: string) =>
			manejarSolicitud(
				new Request("https://hm-avisos.test/instalar", {
					method: "POST",
					headers: { "X-Instalar": clave },
				}),
				entorno(),
			);

		expect((await instalar("otra")).status).toBe(401);
		expect(llamadas).toEqual([]);

		const respuesta = await instalar("secreto-webhook");

		expect(await respuesta.json()).toEqual({
			bot: "hm_avisos_bot",
			invitacion: "https://t.me/hm_avisos_bot?start=hm2026",
		});
		expect(llamadas).toEqual(["setWebhook", "setMyCommands", "getMe"]);
	});
});
