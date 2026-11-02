import { uuidv7 } from "uuidv7";

import type { Rol } from "@/features/auth/SessionContext";
import { ahoraIso } from "@/lib/fechas";

import {
	type Documento,
	type EntidadDocumento,
	nombreSeguro,
	problemaArchivo,
	rutaDocumento,
	tipoDeArchivo,
} from "../domain/documento";
import type { DocumentoRepository } from "../infrastructure/DocumentoRepository";

// El archivo no cumple el tipo, el tamaño o el tope de documentos del registro.
export class ArchivoNoValidoError extends Error {
	constructor(motivo: string) {
		super(motivo);
		this.name = "ArchivoNoValidoError";
	}
}

// Solo quien lo subió o un administrador quita un documento.
export class QuitarDocumentoSinPermisoError extends Error {
	constructor() {
		super("Solo quien subió el documento o un administrador puede quitarlo.");
		this.name = "QuitarDocumentoSinPermisoError";
	}
}

// El archivo no está en el dispositivo y no se pudo bajar (sin conexión o sin SharePoint).
export class ArchivoNoDisponibleError extends Error {
	constructor() {
		super("El archivo no está en este dispositivo. Conéctate a internet para abrirlo.");
		this.name = "ArchivoNoDisponibleError";
	}
}

export type DescargarArchivo = (ruta: string) => Promise<Blob>;

export function puedeQuitar(
	documento: Pick<Documento, "subidoPor">,
	usuario: string,
	rol: Rol | undefined,
): boolean {
	return rol === "ADMIN" || documento.subidoPor === usuario;
}

export class DocumentoService {
	constructor(private readonly repository: DocumentoRepository) {}

	async listar(entidad: EntidadDocumento, registroId: string): Promise<Documento[]> {
		return this.repository.delRegistro(entidad, registroId);
	}

	// Guarda el archivo en el dispositivo; la sincronización lo sube a SharePoint.
	async subir(
		entidad: EntidadDocumento,
		registroId: string,
		archivo: File,
		usuario: string,
	): Promise<Documento> {
		const adjuntos = (await this.repository.delRegistro(entidad, registroId)).length;
		const problema = problemaArchivo(archivo, adjuntos);
		const tipo = tipoDeArchivo(archivo);
		if (problema !== null || tipo === null) {
			throw new ArchivoNoValidoError(problema ?? "Tipo de archivo no permitido.");
		}

		const ahora = ahoraIso();
		const base = { id: uuidv7(), entidad, registroId, nombre: nombreSeguro(archivo.name) };
		const documento: Documento = {
			...base,
			tipo,
			tamano: archivo.size,
			ruta: rutaDocumento(base),
			subidoPor: usuario,
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		await this.repository.agregar(documento, archivo);

		return documento;
	}

	async quitar(id: string, usuario: string, rol: Rol | undefined): Promise<void> {
		const documento = await this.repository.obtener(id);
		if (!documento || documento.deletedAt !== null) {
			return;
		}
		if (!puedeQuitar(documento, usuario, rol)) {
			throw new QuitarDocumentoSinPermisoError();
		}
		const ahora = ahoraIso();
		await this.repository.quitar({
			...documento,
			deletedAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			version: documento.version + 1,
		});
	}

	// El archivo del dispositivo o, si no está, el de SharePoint (y queda guardado).
	async archivo(documento: Documento, descargar?: DescargarArchivo): Promise<Blob> {
		const local = await this.repository.archivoLocal(documento.id);
		if (local) {
			return local;
		}
		if (!descargar || !navigator.onLine) {
			throw new ArchivoNoDisponibleError();
		}
		const bajado = await descargar(documento.ruta);
		await this.repository.guardarCopia(documento.id, bajado);

		return bajado;
	}
}
