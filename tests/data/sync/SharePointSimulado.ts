import {
	ConflictoError,
	type ElementoDrive,
	type PaginaDelta,
	SinConexionError,
} from "../../../src/data/sync/graphClient";
import type { GraphParaSync } from "../../../src/data/sync/syncEngine";

interface Archivo {
	id: string;
	ruta: string;
	eTag: string;
	contenido: unknown;
	secuencia: number;
}

// SharePoint en memoria: guarda archivos con eTag, respeta If-Match / If-None-Match y responde
// /delta con lo que cambió desde el último deltaLink. Lo comparten los "dispositivos" de la prueba.
export class SharePointSimulado implements GraphParaSync {
	readonly archivos = new Map<string, Archivo>();
	conexion = true;
	private secuencia = 0;

	async driveDelSitio(): Promise<string> {
		this.revisarConexion();

		return Promise.resolve("drive-hm");
	}

	async escribirJson(
		_driveId: string,
		ruta: string,
		contenido: unknown,
		condicion: { eTag: string } | "nuevo" | null = null,
	): Promise<ElementoDrive> {
		this.revisarConexion();
		const existente = this.archivos.get(ruta);
		if (condicion === "nuevo" && existente) {
			throw new ConflictoError();
		}
		if (condicion && condicion !== "nuevo" && existente && existente.eTag !== condicion.eTag) {
			throw new ConflictoError();
		}

		return Promise.resolve(
			this.guardar(ruta, JSON.parse(JSON.stringify(contenido)), existente?.id),
		);
	}

	async leerJson<T>(
		_driveId: string,
		ruta: string,
	): Promise<{ contenido: T; elemento: ElementoDrive }> {
		this.revisarConexion();
		const archivo = this.archivos.get(ruta);
		if (!archivo) {
			throw new Error(`No existe ${ruta}`);
		}

		return Promise.resolve({ contenido: archivo.contenido as T, elemento: this.elemento(archivo) });
	}

	async contenido<T>(_driveId: string, itemId: string): Promise<T> {
		this.revisarConexion();
		const archivo = [...this.archivos.values()].find((candidato) => candidato.id === itemId);

		return Promise.resolve(archivo?.contenido as T);
	}

	async delta(_driveId: string, deltaLink?: string): Promise<PaginaDelta> {
		this.revisarConexion();
		const desde = deltaLink ? Number(deltaLink.split("token=")[1]) : 0;

		return Promise.resolve({
			elementos: [...this.archivos.values()]
				.filter((archivo) => archivo.secuencia > desde)
				.map((archivo) => this.elemento(archivo)),
			deltaLink: `https://graph/delta?token=${this.secuencia}`,
		});
	}

	async subirArchivo(_driveId: string, ruta: string, archivo: Blob): Promise<ElementoDrive> {
		this.revisarConexion();

		return Promise.resolve(
			this.guardar(ruta, { bytes: archivo.size }, this.archivos.get(ruta)?.id),
		);
	}

	// Lo que guardó otro dispositivo (o alguien a mano en SharePoint).
	escribirDirecto(ruta: string, contenido: unknown): void {
		this.guardar(ruta, contenido, this.archivos.get(ruta)?.id);
	}

	leer<T>(ruta: string): T | undefined {
		return this.archivos.get(ruta)?.contenido as T | undefined;
	}

	private guardar(ruta: string, contenido: unknown, id?: string): ElementoDrive {
		this.secuencia++;
		const archivo: Archivo = {
			id: id ?? `item-${this.secuencia}`,
			ruta,
			eTag: `"etag-${this.secuencia}"`,
			contenido,
			secuencia: this.secuencia,
		};
		this.archivos.set(ruta, archivo);

		return this.elemento(archivo);
	}

	private elemento(archivo: Archivo): ElementoDrive {
		const partes = archivo.ruta.split("/");

		return {
			id: archivo.id,
			name: partes.at(-1) ?? "",
			eTag: archivo.eTag,
			file: {},
			parentReference: { path: `/drives/drive-hm/root:/${partes.slice(0, -1).join("/")}` },
		};
	}

	private revisarConexion(): void {
		if (!this.conexion) {
			throw new SinConexionError();
		}
	}
}
