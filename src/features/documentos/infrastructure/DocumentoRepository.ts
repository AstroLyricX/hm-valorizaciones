import type { HmDatabase } from "@/data/db";
import { agregarAlOutbox } from "@/data/outbox";

import { type Documento, DocumentoSchema, type EntidadDocumento } from "../domain/documento";

export class DocumentoRepository {
	constructor(private readonly database: HmDatabase) {}

	// Documentos vigentes del registro, del más reciente al más antiguo.
	async delRegistro(entidad: EntidadDocumento, registroId: string): Promise<Documento[]> {
		const documentos = await this.database.documentos
			.where("[entidad+registroId]")
			.equals([entidad, registroId])
			.toArray();

		return documentos
			.filter((documento) => documento.deletedAt === null)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	async obtener(id: string): Promise<Documento | undefined> {
		return this.database.documentos.get(id);
	}

	// Guarda el registro y el archivo (pendiente de subir) en una sola transacción.
	async agregar(documento: Documento, archivo: Blob): Promise<void> {
		const registro = DocumentoSchema.parse(documento);
		const { documentos, archivosDocumento, outbox } = this.database;

		await this.database.transaction("rw", documentos, archivosDocumento, outbox, async () => {
			await documentos.put(registro);
			await archivosDocumento.put({ documentoId: registro.id, archivo, pendiente: 1 });
			await agregarAlOutbox(this.database, "documentos", registro);
		});
	}

	// Borrado lógico. Si el archivo aún no se subió, ya no hace falta subirlo.
	async quitar(documento: Documento): Promise<void> {
		const registro = DocumentoSchema.parse(documento);
		const { documentos, archivosDocumento, outbox } = this.database;

		await this.database.transaction("rw", documentos, archivosDocumento, outbox, async () => {
			await documentos.put(registro);
			await archivosDocumento.delete(registro.id);
			await agregarAlOutbox(this.database, "documentos", registro);
		});
	}

	async archivoLocal(documentoId: string): Promise<Blob | undefined> {
		return (await this.database.archivosDocumento.get(documentoId))?.archivo;
	}

	// Copia de un archivo bajado de SharePoint, para abrirlo de nuevo sin conexión.
	async guardarCopia(documentoId: string, archivo: Blob): Promise<void> {
		await this.database.archivosDocumento.put({ documentoId, archivo, pendiente: 0 });
	}
}
