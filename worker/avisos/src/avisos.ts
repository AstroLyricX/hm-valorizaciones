// Avisos por Telegram (Cloudflare Worker gratuito). La app sube los contratos vigentes y,
// cada mañana, el Worker avisa a los suscritos los que vencen en 7 días o menos sin su última
// valorización emitida. Pasos para publicarlo en worker/avisos/README.md.

// Lo mínimo que se usa de Cloudflare KV.
export interface AlmacenKv {
	get: (clave: string, tipo: "json") => Promise<unknown>;
	put: (clave: string, valor: string) => Promise<void>;
}

export interface Entorno {
	AVISOS: AlmacenKv;
	// Token del bot de @BotFather (secreto: `wrangler secret put TELEGRAM_TOKEN`).
	TELEGRAM_TOKEN: string;
	// Telegram lo manda en cada mensaje al Worker (secreto: TELEGRAM_WEBHOOK_SECRET).
	TELEGRAM_WEBHOOK_SECRET: string;
	// Código del enlace de invitación t.me/<bot>?start=<código> (secreto: INVITACION).
	INVITACION: string;
	// Orígenes de la app que pueden subir los contratos, separados por comas.
	ORIGENES: string;
	// Dirección de la app para el botón "Abrir la app".
	APP_URL?: string;
}

// Contrato vigente tal como lo sube la app.
export interface ContratoAviso {
	id: string;
	codigo: string;
	proyecto: string;
	cliente: string;
	// "YYYY-MM-DD".
	fechaFin: string;
	// "Octubre 2026": la última valorización que corresponde.
	periodo: string;
	// true si falta emitir la valorización de ese último periodo.
	pendiente: boolean;
}

export interface Suscriptor {
	chatId: number;
	nombre: string;
	desde: string;
}

export const DIAS_AVISO = 7;
const CONTRATOS = "contratos";
const SUSCRIPTORES = "suscriptores";
const MAX_CONTRATOS = 500;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function textoCorto(valor: unknown, maximo: number): string | null {
	return typeof valor === "string" && valor.length <= maximo ? valor : null;
}

// Valida lo que sube la app: nada de lo que llega se usa sin revisar.
export function validarContratos(cuerpo: unknown): ContratoAviso[] | null {
	const lista = (cuerpo as { contratos?: unknown } | null)?.contratos;
	if (!Array.isArray(lista) || lista.length > MAX_CONTRATOS) {
		return null;
	}
	const contratos: ContratoAviso[] = [];
	for (const item of lista as Record<string, unknown>[]) {
		const id = textoCorto(item.id, 64);
		const codigo = textoCorto(item.codigo, 20);
		const proyecto = textoCorto(item.proyecto, 150);
		const cliente = textoCorto(item.cliente, 150);
		const fechaFin = textoCorto(item.fechaFin, 10);
		const periodo = textoCorto(item.periodo, 30);
		if (
			id === null ||
			codigo === null ||
			!/^CTR-\d{3,}$/.test(codigo) ||
			proyecto === null ||
			cliente === null ||
			fechaFin === null ||
			!FECHA.test(fechaFin) ||
			periodo === null ||
			typeof item.pendiente !== "boolean"
		) {
			return null;
		}
		contratos.push({ id, codigo, proyecto, cliente, fechaFin, periodo, pendiente: item.pendiente });
	}

	return contratos;
}

// Fecha de hoy en Lima (UTC-5, sin horario de verano).
export function hoyEnLima(ahora = new Date()): string {
	return new Date(ahora.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
	return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

function fechaNumerica(iso: string): string {
	const [anio, mes, dia] = iso.split("-");

	return `${dia}/${mes}/${anio}`;
}

function textoDias(dias: number): string {
	if (dias === 0) {
		return "vence hoy";
	}

	return dias === 1 ? "vence mañana" : `vence en ${dias} días`;
}

// Contratos que vencen en 7 días o menos y aún no tienen su última valorización emitida.
export function pendientes(contratos: readonly ContratoAviso[], hoy: string): ContratoAviso[] {
	return contratos
		.filter((contrato) => {
			const dias = diasEntre(hoy, contrato.fechaFin);

			return contrato.pendiente && dias >= 0 && dias <= DIAS_AVISO;
		})
		.sort((a, b) => a.fechaFin.localeCompare(b.fechaFin));
}

export function mensajePendientes(lista: readonly ContratoAviso[], hoy: string): string {
	const lineas = lista.map(
		(contrato) =>
			`• ${contrato.codigo} · ${contrato.proyecto}\n  ${contrato.cliente}\n  ${textoDias(diasEntre(hoy, contrato.fechaFin))} (${fechaNumerica(contrato.fechaFin)}) · falta valorizar ${contrato.periodo}`,
	);

	return [
		lista.length === 1
			? "⚠️ H&M: 1 contrato vence sin su última valorización"
			: `⚠️ H&M: ${lista.length} contratos vencen sin su última valorización`,
		"",
		...lineas,
		"",
		"Genera la valorización antes del vencimiento.",
	].join("\n");
}

async function leerLista<T>(kv: AlmacenKv, clave: string): Promise<T[]> {
	const valor = await kv.get(clave, "json");

	return Array.isArray(valor) ? (valor as T[]) : [];
}

// Envía un mensaje; devuelve false si el usuario bloqueó o borró el chat con el bot.
async function enviar(entorno: Entorno, chatId: number, texto: string): Promise<boolean> {
	const respuesta = await fetch(
		`https://api.telegram.org/bot${entorno.TELEGRAM_TOKEN}/sendMessage`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chat_id: chatId,
				text: texto,
				...(entorno.APP_URL
					? {
							reply_markup: { inline_keyboard: [[{ text: "Abrir la app", url: entorno.APP_URL }]] },
						}
					: {}),
			}),
		},
	);

	return respuesta.status !== 403 && respuesta.status !== 400;
}

// Tarea diaria (cron): avisa a todos los suscritos. Si no hay pendientes, no manda nada.
export async function avisarPendientes(entorno: Entorno, hoy = hoyEnLima()): Promise<number> {
	const lista = pendientes(await leerLista<ContratoAviso>(entorno.AVISOS, CONTRATOS), hoy);
	if (lista.length === 0) {
		return 0;
	}
	const suscriptores = await leerLista<Suscriptor>(entorno.AVISOS, SUSCRIPTORES);
	const texto = mensajePendientes(lista, hoy);
	const entregados = await Promise.all(
		suscriptores.map(async (suscriptor) => enviar(entorno, suscriptor.chatId, texto)),
	);
	const activos = suscriptores.filter((_, indice) => entregados[indice]);
	if (activos.length !== suscriptores.length) {
		await entorno.AVISOS.put(SUSCRIPTORES, JSON.stringify(activos));
	}

	return activos.length;
}

interface MensajeTelegram {
	message?: { text?: string; chat?: { id?: number; first_name?: string; title?: string } };
}

// Mensajes que recibe el bot: /start <invitación> suscribe, /salir da de baja y
// /pendientes muestra la lista del día.
export async function atenderMensaje(
	entorno: Entorno,
	actualizacion: MensajeTelegram,
	hoy = hoyEnLima(),
): Promise<void> {
	const chat = actualizacion.message?.chat;
	const texto = actualizacion.message?.text?.trim() ?? "";
	if (typeof chat?.id !== "number") {
		return;
	}
	const chatId = chat.id;
	const suscriptores = await leerLista<Suscriptor>(entorno.AVISOS, SUSCRIPTORES);
	const suscrito = suscriptores.some((suscriptor) => suscriptor.chatId === chatId);
	const [comando = "", argumento = ""] = texto.split(/\s+/);

	if (comando === "/start") {
		if (suscrito) {
			await enviar(
				entorno,
				chatId,
				"Ya recibes los avisos de H&M. Para dejar de recibirlos: /salir",
			);
		} else if (entorno.INVITACION !== "" && argumento === entorno.INVITACION) {
			suscriptores.push({
				chatId,
				nombre: (chat.first_name ?? chat.title ?? "").slice(0, 80),
				desde: hoy,
			});
			await entorno.AVISOS.put(SUSCRIPTORES, JSON.stringify(suscriptores));
			await enviar(
				entorno,
				chatId,
				"Listo: cada mañana te avisaré los contratos que vencen en 7 días o menos sin su última valorización.\n\n/pendientes muestra la lista de hoy · /salir deja de enviarte avisos",
			);
		} else {
			await enviar(entorno, chatId, "Para recibir los avisos de H&M usa el enlace de invitación.");
		}

		return;
	}
	if (!suscrito) {
		await enviar(entorno, chatId, "Para recibir los avisos de H&M usa el enlace de invitación.");

		return;
	}
	if (comando === "/salir") {
		await entorno.AVISOS.put(
			SUSCRIPTORES,
			JSON.stringify(suscriptores.filter((suscriptor) => suscriptor.chatId !== chatId)),
		);
		await enviar(
			entorno,
			chatId,
			"Ya no recibirás avisos. Para volver, usa el enlace de invitación.",
		);

		return;
	}
	if (comando === "/pendientes") {
		const lista = pendientes(await leerLista<ContratoAviso>(entorno.AVISOS, CONTRATOS), hoy);
		await enviar(
			entorno,
			chatId,
			lista.length === 0
				? "✅ Hoy no hay contratos por vencer sin valorizar."
				: mensajePendientes(lista, hoy),
		);

		return;
	}
	await enviar(
		entorno,
		chatId,
		"/pendientes muestra la lista de hoy · /salir deja de enviarte avisos",
	);
}

function cabecerasCors(origen: string | null, entorno: Entorno): Record<string, string> {
	const permitidos = entorno.ORIGENES.split(",").map((permitido) => permitido.trim());
	if (!origen || !permitidos.includes(origen)) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origen,
		"Access-Control-Allow-Methods": "PUT, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		Vary: "Origin",
	};
}

// Compara en tiempo constante para no revelar el secreto por la demora de la respuesta.
function iguales(a: string, b: string): boolean {
	if (a.length !== b.length || a === "") {
		return false;
	}
	let diferencia = 0;
	for (let indice = 0; indice < a.length; indice++) {
		diferencia |= a.charCodeAt(indice) ^ b.charCodeAt(indice);
	}

	return diferencia === 0;
}

export async function manejarSolicitud(solicitud: Request, entorno: Entorno): Promise<Response> {
	const url = new URL(solicitud.url);
	const origen = solicitud.headers.get("Origin");
	const cors = cabecerasCors(origen, entorno);

	if (url.pathname === "/contratos") {
		if (solicitud.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: cors });
		}
		// Solo la app publicada (o en local) puede subir los contratos.
		if (solicitud.method !== "PUT" || !("Access-Control-Allow-Origin" in cors)) {
			return new Response(null, { status: 403 });
		}
		const largo = Number(solicitud.headers.get("Content-Length") ?? "0");
		if (largo > 256_000) {
			return new Response(null, { status: 413, headers: cors });
		}
		const contratos = validarContratos(await solicitud.json().catch(() => null));
		if (!contratos) {
			return new Response(null, { status: 400, headers: cors });
		}
		await entorno.AVISOS.put(CONTRATOS, JSON.stringify(contratos));

		return new Response(null, { status: 204, headers: cors });
	}

	if (url.pathname === "/telegram" && solicitud.method === "POST") {
		const secreto = solicitud.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
		if (!iguales(secreto, entorno.TELEGRAM_WEBHOOK_SECRET)) {
			return new Response(null, { status: 401 });
		}
		const actualizacion = (await solicitud.json().catch(() => ({}))) as MensajeTelegram;
		await atenderMensaje(entorno, actualizacion);

		return new Response(null, { status: 200 });
	}

	// Conecta el bot con este Worker (una sola vez, después de cada cambio de token).
	if (url.pathname === "/instalar" && solicitud.method === "POST") {
		if (!iguales(solicitud.headers.get("X-Instalar") ?? "", entorno.TELEGRAM_WEBHOOK_SECRET)) {
			return new Response(null, { status: 401 });
		}

		return Response.json(await instalar(entorno, `${url.origin}/telegram`));
	}

	return new Response(null, { status: 404 });
}

async function telegram(entorno: Entorno, metodo: string, datos: unknown = {}): Promise<unknown> {
	const respuesta = await fetch(`https://api.telegram.org/bot${entorno.TELEGRAM_TOKEN}/${metodo}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(datos),
	});

	return respuesta.json();
}

// Registra el webhook y los comandos; devuelve el usuario del bot para armar la invitación.
export async function instalar(
	entorno: Entorno,
	webhook: string,
): Promise<{ bot: string | null; invitacion: string | null }> {
	await telegram(entorno, "setWebhook", {
		url: webhook,
		secret_token: entorno.TELEGRAM_WEBHOOK_SECRET,
		allowed_updates: ["message"],
	});
	await telegram(entorno, "setMyCommands", {
		commands: [
			{ command: "pendientes", description: "Contratos por vencer sin valorizar" },
			{ command: "salir", description: "Dejar de recibir avisos" },
		],
	});
	const yo = (await telegram(entorno, "getMe")) as { result?: { username?: string } };
	const bot = yo.result?.username ?? null;

	return { bot, invitacion: bot ? `https://t.me/${bot}?start=${entorno.INVITACION}` : null };
}
