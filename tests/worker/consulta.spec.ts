import {
	type CacheKv,
	type Entorno,
	manejarSolicitud,
	normalizar,
} from "../../worker/ruc/src/consulta";

const RUC = "20602629903";
const DECOLECTA = {
	razon_social: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L.",
	numero_documento: RUC,
	estado: "ACTIVO",
	condicion: "HABIDO",
	direccion: "AV. CIRCUNVALACION S/N",
	distrito: "OLLACHEA",
	provincia: "CARABAYA",
	departamento: "PUNO",
};

function cacheEnMemoria() {
	const datos = new Map<string, string>();
	const cache = {
		get: jest.fn(async (clave: string) => {
			const valor = datos.get(clave);

			return Promise.resolve(valor === undefined ? null : (JSON.parse(valor) as unknown));
		}),
		put: jest.fn(async (clave: string, valor: string) => {
			datos.set(clave, valor);
			await Promise.resolve();
		}),
	} satisfies CacheKv;

	return cache;
}

function entorno(
	cache = cacheEnMemoria(),
): Entorno & { RUC_CACHE: ReturnType<typeof cacheEnMemoria> } {
	return {
		RUC_CACHE: cache,
		RUC_API_TOKEN: "secreto",
		ORIGENES: "http://localhost:3000, https://astrolyricx.github.io",
	};
}

function api(status: number, cuerpo: unknown = DECOLECTA) {
	return jest.fn(async () => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })));
}

function solicitud(ruta: string, metodo = "GET") {
	return new Request(`https://hm-ruc.workers.dev${ruta}`, {
		method: metodo,
		headers: { Origin: "https://astrolyricx.github.io" },
	});
}

describe("Worker de RUC", () => {
	it("consulta la API con el token y devuelve los datos normalizados", async () => {
		const externo = api(200);
		const env = entorno();

		const respuesta = await manejarSolicitud(solicitud(`/ruc/${RUC}`), env, externo);

		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toEqual({
			ruc: RUC,
			razonSocial: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L.",
			estado: "ACTIVO",
			condicion: "HABIDO",
			direccion: "AV. CIRCUNVALACION S/N - OLLACHEA - CARABAYA - PUNO",
		});
		expect(externo).toHaveBeenCalledWith(
			`https://api.decolecta.com/v1/sunat/ruc?numero=${RUC}`,
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: "Bearer secreto" }),
			}),
		);
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(
			"https://astrolyricx.github.io",
		);
		expect(respuesta.headers.get("X-Cache")).toBe("MISS");
	});

	it("la segunda consulta sale de la caché sin llamar a la API", async () => {
		const externo = api(200);
		const env = entorno();
		await manejarSolicitud(solicitud(`/ruc/${RUC}`), env, externo);

		const respuesta = await manejarSolicitud(solicitud(`/ruc/${RUC}`), env, externo);

		expect(respuesta.headers.get("X-Cache")).toBe("HIT");
		expect(externo).toHaveBeenCalledTimes(1);
		expect(env.RUC_CACHE.put).toHaveBeenCalledWith(`ruc:${RUC}`, expect.any(String), {
			expirationTtl: 2592000,
		});
	});

	it("rechaza un RUC inválido sin gastar consultas", async () => {
		const externo = api(200);

		const respuesta = await manejarSolicitud(solicitud("/ruc/20123456789"), entorno(), externo);

		expect(respuesta.status).toBe(400);
		expect(externo).not.toHaveBeenCalled();
	});

	it("responde 404 si SUNAT no lo tiene y 502 si la API falla", async () => {
		expect((await manejarSolicitud(solicitud(`/ruc/${RUC}`), entorno(), api(404, {}))).status).toBe(
			404,
		);
		expect((await manejarSolicitud(solicitud(`/ruc/${RUC}`), entorno(), api(500, {}))).status).toBe(
			502,
		);
		const caido = jest.fn(async () => Promise.reject(new TypeError("fetch failed")));
		expect((await manejarSolicitud(solicitud(`/ruc/${RUC}`), entorno(), caido)).status).toBe(502);
	});

	it("responde al preflight de CORS y no da permiso a otros orígenes", async () => {
		const preflight = await manejarSolicitud(
			solicitud(`/ruc/${RUC}`, "OPTIONS"),
			entorno(),
			api(200),
		);
		expect(preflight.status).toBe(204);
		expect(preflight.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");

		const ajeno = new Request(`https://hm-ruc.workers.dev/ruc/${RUC}`, {
			headers: { Origin: "https://otro-sitio.com" },
		});
		const respuesta = await manejarSolicitud(ajeno, entorno(), api(200));
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBeNull();
		expect((await manejarSolicitud(solicitud("/otra"), entorno(), api(200))).status).toBe(404);
	});

	it("entiende también la respuesta de apis.net.pe", () => {
		expect(
			normalizar("10098637074", {
				razonSocial: "HUISE QUEA ANTOLIN",
				estado: "ACTIVO",
				condicion: "HABIDO",
				direccion: "JR. BELLAVISTA S/N OLLACHEA",
				distrito: "OLLACHEA",
				provincia: "CARABAYA",
				departamento: "PUNO",
			}),
		).toEqual({
			ruc: "10098637074",
			razonSocial: "HUISE QUEA ANTOLIN",
			estado: "ACTIVO",
			condicion: "HABIDO",
			direccion: "JR. BELLAVISTA S/N OLLACHEA",
		});
		expect(normalizar(RUC, { estado: "ACTIVO" })).toBeNull();
	});
});
