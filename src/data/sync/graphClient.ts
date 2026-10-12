/* eslint-disable no-await-in-loop -- las páginas de delta, los reintentos y las partes de una
   subida van en orden: cada solicitud depende de la anterior. */
// Cliente mínimo de Microsoft Graph para la carpeta compartida de H&M en SharePoint.
// Reintenta ante saturación (429/503/504) respetando Retry-After y usa eTags para no
// sobrescribir cambios ajenos sin darse cuenta.

const GRAPH = "https://graph.microsoft.com/v1.0";
const REINTENTOS = 4;
// Archivos más grandes se suben por partes con una sesión de subida.
export const LIMITE_SUBIDA_SIMPLE = 4 * 1024 * 1024;
// Graph exige partes múltiplos de 320 KiB.
const PARTE = 320 * 1024 * 10;

export interface ElementoDrive {
	id: string;
	name: string;
	eTag?: string;
	lastModifiedDateTime?: string;
	parentReference?: { path?: string };
	file?: unknown;
	folder?: unknown;
	deleted?: unknown;
}

export interface PaginaDelta {
	elementos: ElementoDrive[];
	deltaLink: string;
}

export class GraphError extends Error {
	constructor(
		readonly status: number,
		mensaje: string,
	) {
		super(mensaje);
		this.name = "GraphError";
	}
}

// El archivo cambió en otro dispositivo desde la última vez que lo vimos (412).
export class ConflictoError extends GraphError {
	constructor() {
		super(412, "El archivo fue modificado en otro dispositivo.");
		this.name = "ConflictoError";
	}
}

// No se pudo llegar a Graph (sin conexión o red caída).
export class SinConexionError extends Error {
	constructor() {
		super("Sin conexión con Microsoft 365.");
		this.name = "SinConexionError";
	}
}

export interface OpcionesGraph {
	obtenerToken: () => Promise<string>;
	fetch?: typeof fetch;
	esperar?: (ms: number) => Promise<void>;
}

function codificarRuta(ruta: string): string {
	return ruta.split("/").map(encodeURIComponent).join("/");
}

async function esperarMs(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export class GraphClient {
	private readonly obtenerToken: () => Promise<string>;
	private readonly fetch: typeof fetch;
	private readonly esperar: (ms: number) => Promise<void>;

	constructor({ obtenerToken, fetch: fetchPropio, esperar = esperarMs }: OpcionesGraph) {
		this.obtenerToken = obtenerToken;
		this.fetch = fetchPropio ?? globalThis.fetch.bind(globalThis);
		this.esperar = esperar;
	}

	// Biblioteca de documentos del sitio: "hmcontratistas.sharepoint.com:/sites/SistemaHM".
	async driveDelSitio(sitio: string): Promise<string> {
		const { id } = await this.json<{ id: string }>("GET", `/sites/${sitio}`);
		const drive = await this.json<{ id: string }>("GET", `/sites/${id}/drive`);

		return drive.id;
	}

	// Crea o reemplaza un JSON. Con eTag solo escribe si nadie lo cambió desde entonces; con
	// "nuevo", solo si el archivo aún no existe. Sin condición, lo sobrescribe.
	async escribirJson(
		driveId: string,
		ruta: string,
		contenido: unknown,
		condicion: { eTag: string } | "nuevo" | null = null,
	): Promise<ElementoDrive> {
		const encabezados: Record<string, string> =
			condicion === "nuevo"
				? { "If-None-Match": "*" }
				: condicion
					? { "If-Match": condicion.eTag }
					: {};

		return this.json<ElementoDrive>(
			"PUT",
			`/drives/${driveId}/root:/${codificarRuta(ruta)}:/content`,
			{
				body: JSON.stringify(contenido),
				headers: { "Content-Type": "application/json", ...encabezados },
			},
		);
	}

	async leerJson<T>(
		driveId: string,
		ruta: string,
	): Promise<{ contenido: T; elemento: ElementoDrive }> {
		const elemento = await this.json<ElementoDrive>(
			"GET",
			`/drives/${driveId}/root:/${codificarRuta(ruta)}`,
		);

		return { contenido: await this.contenido<T>(driveId, elemento.id), elemento };
	}

	async contenido<T>(driveId: string, itemId: string): Promise<T> {
		const respuesta = await this.solicitar("GET", `/drives/${driveId}/items/${itemId}/content`);

		return (await respuesta.json()) as T;
	}

	// Cambios del drive desde la última consulta; sin deltaLink, trae todo. En SharePoint y OneDrive
	// para empresas /delta solo existe en la raíz: quien llama filtra por carpeta.
	async delta(driveId: string, deltaLink?: string): Promise<PaginaDelta> {
		const elementos: ElementoDrive[] = [];
		let siguiente: string | undefined = deltaLink ?? `/drives/${driveId}/root/delta`;

		while (siguiente) {
			const pagina: {
				value: ElementoDrive[];
				"@odata.nextLink"?: string;
				"@odata.deltaLink"?: string;
			} = await this.json("GET", siguiente);
			elementos.push(...pagina.value);
			if (pagina["@odata.deltaLink"]) {
				return { elementos, deltaLink: pagina["@odata.deltaLink"] };
			}
			siguiente = pagina["@odata.nextLink"];
		}

		throw new GraphError(500, "Graph no devolvió el deltaLink.");
	}

	// Sube un archivo (PDF). Hasta 4 MB en una sola solicitud; más grande, por partes.
	async subirArchivo(driveId: string, ruta: string, archivo: Blob): Promise<ElementoDrive> {
		const destino = `/drives/${driveId}/root:/${codificarRuta(ruta)}`;
		if (archivo.size <= LIMITE_SUBIDA_SIMPLE) {
			return this.json<ElementoDrive>("PUT", `${destino}:/content`, {
				body: archivo,
				headers: { "Content-Type": archivo.type || "application/octet-stream" },
			});
		}

		const { uploadUrl } = await this.json<{ uploadUrl: string }>(
			"POST",
			`${destino}:/createUploadSession`,
			{
				body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "replace" } }),
				headers: { "Content-Type": "application/json" },
			},
		);
		let respuesta: Response | undefined;
		for (let inicio = 0; inicio < archivo.size; inicio += PARTE) {
			const fin = Math.min(inicio + PARTE, archivo.size);
			// La URL de la sesión ya está autorizada: no lleva el token.
			respuesta = await this.solicitar("PUT", uploadUrl, {
				body: archivo.slice(inicio, fin),
				headers: {
					"Content-Length": String(fin - inicio),
					"Content-Range": `bytes ${inicio}-${fin - 1}/${archivo.size}`,
				},
				sinToken: true,
			});
		}

		return (await (respuesta as Response).json()) as ElementoDrive;
	}

	private async json<T>(
		metodo: string,
		ruta: string,
		opciones: { body?: BodyInit; headers?: Record<string, string> } = {},
	): Promise<T> {
		const respuesta = await this.solicitar(metodo, ruta, opciones);

		return (await respuesta.json()) as T;
	}

	private async solicitar(
		metodo: string,
		ruta: string,
		{
			body,
			headers = {},
			sinToken = false,
		}: { body?: BodyInit; headers?: Record<string, string>; sinToken?: boolean } = {},
	): Promise<Response> {
		const url = ruta.startsWith("https://") ? ruta : `${GRAPH}${ruta}`;

		for (let intento = 1; ; intento++) {
			const autorizacion: Record<string, string> = sinToken
				? {}
				: { Authorization: `Bearer ${await this.obtenerToken()}` };
			let respuesta: Response;
			try {
				respuesta = await this.fetch(url, {
					method: metodo,
					body,
					headers: { ...autorizacion, ...headers },
				});
			} catch {
				throw new SinConexionError();
			}

			if (respuesta.ok) {
				return respuesta;
			}
			if (respuesta.status === 412) {
				throw new ConflictoError();
			}
			if ([429, 503, 504].includes(respuesta.status) && intento < REINTENTOS) {
				const segundos = Number(respuesta.headers.get("Retry-After"));
				await this.esperar(
					Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : 2 ** intento * 500,
				);
				continue;
			}
			throw new GraphError(
				respuesta.status,
				`Graph respondió ${respuesta.status} en ${metodo} ${ruta.split("?")[0]}.`,
			);
		}
	}
}
