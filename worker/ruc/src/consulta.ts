import { rucValido } from "../../../src/shared/domain/ruc";

// Datos de un contribuyente que devuelve el Worker, iguales para cualquier proveedor de la API.
export interface DatosRuc {
	ruc: string;
	razonSocial: string;
	// "ACTIVO", "BAJA DE OFICIO"…
	estado: string;
	// "HABIDO", "NO HABIDO"…
	condicion: string;
	direccion: string;
}

// Lo mínimo que se usa de Cloudflare KV (caché de consultas).
export interface CacheKv {
	get: (clave: string, tipo: "json") => Promise<unknown>;
	put: (clave: string, valor: string, opciones?: { expirationTtl?: number }) => Promise<void>;
}

export interface Entorno {
	RUC_CACHE: CacheKv;
	// Token de la API de RUC (secreto: `wrangler secret put RUC_API_TOKEN`).
	RUC_API_TOKEN: string;
	// URL de la API; se le agrega el número. Por defecto Decolecta.
	RUC_API_URL?: string;
	// Orígenes permitidos, separados por comas.
	ORIGENES: string;
}

const API_POR_DEFECTO = "https://api.decolecta.com/v1/sunat/ruc?numero=";
// Los datos de SUNAT cambian poco: un mes de caché.
const UN_MES = 30 * 24 * 60 * 60;

function texto(valor: unknown): string {
	return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
}

// Acepta las respuestas de Decolecta (snake_case) y de apis.net.pe v2 (camelCase).
export function normalizar(ruc: string, respuesta: Record<string, unknown>): DatosRuc | null {
	const razonSocial = texto(respuesta.razon_social ?? respuesta.razonSocial ?? respuesta.nombre);
	if (razonSocial === "") {
		return null;
	}
	const direccion = texto(respuesta.direccion);
	const lugar = [respuesta.distrito, respuesta.provincia, respuesta.departamento]
		.map(texto)
		.filter(Boolean)
		.join(" - ");
	// Algunas respuestas ya incluyen el distrito en la dirección.
	const completa =
		direccion && lugar && !direccion.includes(texto(respuesta.distrito))
			? `${direccion} - ${lugar}`
			: direccion;

	return {
		ruc,
		razonSocial,
		estado: texto(respuesta.estado),
		condicion: texto(respuesta.condicion),
		direccion: completa === "-" ? "" : completa,
	};
}

function cabecerasCors(origen: string | null, entorno: Entorno): Record<string, string> {
	const permitidos = entorno.ORIGENES.split(",").map((permitido) => permitido.trim());
	if (!origen || !permitidos.includes(origen)) {
		return {};
	}

	return {
		"Access-Control-Allow-Origin": origen,
		"Access-Control-Allow-Methods": "GET, OPTIONS",
		Vary: "Origin",
	};
}

function json(cuerpo: unknown, status: number, cabeceras: Record<string, string>): Response {
	return new Response(JSON.stringify(cuerpo), {
		status,
		headers: { "Content-Type": "application/json; charset=utf-8", ...cabeceras },
	});
}

// GET /ruc/:numero → datos del contribuyente. Valida el RUC, busca en la caché y si no está
// consulta la API con el token guardado en el Worker (la app nunca lo ve).
export async function manejarSolicitud(
	solicitud: Request,
	entorno: Entorno,
	fetchExterno: typeof fetch = fetch,
): Promise<Response> {
	const cors = cabecerasCors(solicitud.headers.get("Origin"), entorno);
	if (solicitud.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}
	const coincidencia = /^\/ruc\/(\d+)$/.exec(new URL(solicitud.url).pathname);
	if (solicitud.method !== "GET" || !coincidencia) {
		return json({ error: "Ruta no encontrada." }, 404, cors);
	}
	const ruc = coincidencia[1];
	if (!rucValido(ruc)) {
		return json({ error: "El RUC no es válido." }, 400, cors);
	}

	const guardado = (await entorno.RUC_CACHE.get(`ruc:${ruc}`, "json")) as DatosRuc | null;
	if (guardado) {
		return json(guardado, 200, { ...cors, "X-Cache": "HIT" });
	}

	let respuesta: Response;
	try {
		respuesta = await fetchExterno(`${entorno.RUC_API_URL ?? API_POR_DEFECTO}${ruc}`, {
			headers: { Authorization: `Bearer ${entorno.RUC_API_TOKEN}`, Accept: "application/json" },
		});
	} catch {
		return json({ error: "La consulta de RUC no está disponible." }, 502, cors);
	}
	if (respuesta.status === 404 || respuesta.status === 422) {
		return json({ error: "El RUC no figura en SUNAT." }, 404, cors);
	}
	if (!respuesta.ok) {
		return json({ error: "La consulta de RUC no está disponible." }, 502, cors);
	}
	const datos = normalizar(ruc, (await respuesta.json()) as Record<string, unknown>);
	if (!datos) {
		return json({ error: "El RUC no figura en SUNAT." }, 404, cors);
	}
	await entorno.RUC_CACHE.put(`ruc:${ruc}`, JSON.stringify(datos), { expirationTtl: UN_MES });

	return json(datos, 200, { ...cors, "X-Cache": "MISS" });
}
