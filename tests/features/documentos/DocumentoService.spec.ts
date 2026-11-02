import { HmDatabase } from "../../../src/data/db";
import {
	ArchivoNoDisponibleError,
	ArchivoNoValidoError,
	DocumentoService,
	QuitarDocumentoSinPermisoError,
} from "../../../src/features/documentos/application/DocumentoService";
import { DocumentoRepository } from "../../../src/features/documentos/infrastructure/DocumentoRepository";

let database: HmDatabase;
let service: DocumentoService;

function pdf(nombre = "Contrato firmado.pdf", tamano = 1000): File {
	return new File(["x".repeat(tamano)], nombre, { type: "application/pdf" });
}

beforeEach(() => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	service = new DocumentoService(new DocumentoRepository(database));
});

afterEach(async () => {
	await database.delete();
});

describe("DocumentoService", () => {
	it("guarda el documento en el dispositivo, pendiente de subir a SharePoint", async () => {
		const documento = await service.subir("contratos", "c1", pdf(), "ana@hm.pe");

		expect(documento).toMatchObject({
			entidad: "contratos",
			registroId: "c1",
			nombre: "Contrato firmado.pdf",
			tipo: "application/pdf",
			tamano: 1000,
			subidoPor: "ana@hm.pe",
			ruta: `SistemaHM/archivos/contratos/c1/${documento.id}/Contrato firmado.pdf`,
		});
		expect(await database.archivosDocumento.get(documento.id)).toMatchObject({ pendiente: 1 });
		expect(await database.outbox.where("entidad").equals("documentos").count()).toBe(1);
		expect(await service.listar("contratos", "c1")).toHaveLength(1);
		expect(await service.listar("contratos", "otro")).toHaveLength(0);
	});

	it("rechaza tipos no permitidos", async () => {
		await expect(
			service.subir("equipos", "e1", new File(["x"], "virus.exe"), "ana@hm.pe"),
		).rejects.toBeInstanceOf(ArchivoNoValidoError);
	});

	it("quita el documento quien lo subió o un administrador", async () => {
		const documento = await service.subir("valorizaciones", "v1", pdf(), "ana@hm.pe");

		await expect(service.quitar(documento.id, "luis@hm.pe", "OPERADOR")).rejects.toBeInstanceOf(
			QuitarDocumentoSinPermisoError,
		);
		await service.quitar(documento.id, "jefe@hm.pe", "ADMIN");

		expect(await service.listar("valorizaciones", "v1")).toHaveLength(0);
		// Ya no hace falta subirlo.
		expect(await database.archivosDocumento.get(documento.id)).toBeUndefined();
	});

	it("abre el archivo del dispositivo o lo baja de SharePoint y lo guarda", async () => {
		const propio = await service.subir("contratos", "c1", pdf(), "ana@hm.pe");
		// En Jest la base simulada no conserva el contenido del Blob: basta con que exista.
		expect(await service.archivo(propio)).toBeDefined();

		const deOtro = { ...propio, id: "de-otro-dispositivo" };
		await expect(service.archivo(deOtro)).rejects.toBeInstanceOf(ArchivoNoDisponibleError);
		const descargar = jest.fn(async () => Promise.resolve(new Blob(["remoto"])));
		expect((await service.archivo(deOtro, descargar)).size).toBe(6);
		expect(descargar).toHaveBeenCalledWith(propio.ruta);
		// La segunda vez ya está en el dispositivo.
		await service.archivo(deOtro, descargar);
		expect(descargar).toHaveBeenCalledTimes(1);
	});
});
