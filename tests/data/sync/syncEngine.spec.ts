import { HmDatabase } from "../../../src/data/db";
import { SinConexionError } from "../../../src/data/sync/graphClient";
import { rutaPdf, SyncEngine } from "../../../src/data/sync/syncEngine";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import type { Tercero } from "../../../src/features/clientes/domain/tercero";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { CLIENTE, HUISE } from "../../support/fixtures";
import { SharePointSimulado } from "./SharePointSimulado";

interface Dispositivo {
	database: HmDatabase;
	terceros: TerceroService;
	sync: SyncEngine;
}

let sharepoint: SharePointSimulado;
let bases: HmDatabase[];

function dispositivo(): Dispositivo {
	const database = new HmDatabase(`test-${crypto.randomUUID()}`);
	bases.push(database);

	return {
		database,
		terceros: new TerceroService(new TerceroRepository(database)),
		sync: new SyncEngine(database, sharepoint, "hm.sharepoint.com:/sites/SistemaHM"),
	};
}

// Edición con una hora explícita, para decidir qué cambio es "el más reciente".
async function editar(
	{ database }: Dispositivo,
	id: string,
	cambios: Partial<Tercero>,
	updatedAt: string,
): Promise<void> {
	const actual = await database.terceros.get(id);
	if (!actual) {
		throw new Error("Sin tercero");
	}
	const editado = { ...actual, ...cambios, updatedAt, version: actual.version + 1 };
	await database.transaction("rw", database.terceros, database.outbox, async () => {
		await database.terceros.put(editado);
		await database.outbox.add({
			entidad: "terceros",
			registroId: id,
			operacion: "upsert",
			payload: editado,
			createdAt: updatedAt,
			intentos: 0,
		});
	});
}

beforeEach(() => {
	sharepoint = new SharePointSimulado();
	bases = [];
});

afterEach(async () => {
	await Promise.all(bases.map(async (database) => database.delete()));
});

describe("SyncEngine", () => {
	it("sube lo pendiente como un JSON por registro y vacía el outbox", async () => {
		const celular = dispositivo();
		const cliente = await celular.terceros.crear(CLIENTE, "ana@hm.pe");

		const resultado = await celular.sync.sincronizar();

		expect(resultado).toMatchObject({ subidos: 1, conflictos: [], avisos: [] });
		expect(sharepoint.leer(`SistemaHM/terceros/${cliente.id}.json`)).toMatchObject({
			codigo: "CLI-001",
			razonSocial: "CONSTRUCTORA ANDINA SAC",
		});
		expect(await celular.database.outbox.count()).toBe(0);
	});

	it("otro dispositivo baja los cambios con delta, sin volver a subirlos", async () => {
		const celular = dispositivo();
		const oficina = dispositivo();
		const cliente = await celular.terceros.crear(CLIENTE, "ana@hm.pe");
		await celular.sync.sincronizar();

		const resultado = await oficina.sync.sincronizar();

		expect(resultado).toMatchObject({ bajados: 1, subidos: 0 });
		expect(await oficina.database.terceros.get(cliente.id)).toMatchObject({ ruc: "20602629903" });
		expect(await oficina.database.outbox.count()).toBe(0);
		// La siguiente vez no hay nada nuevo (ni siquiera lo que subió el propio celular).
		expect(await oficina.sync.sincronizar()).toMatchObject({ bajados: 0, subidos: 0 });
		expect(await celular.sync.sincronizar()).toMatchObject({ bajados: 0, subidos: 0 });
	});

	it("en un conflicto gana el cambio más reciente, en los dos dispositivos", async () => {
		const celular = dispositivo();
		const oficina = dispositivo();
		const { id } = await celular.terceros.crear(HUISE, "ana@hm.pe");
		await celular.sync.sincronizar();
		await oficina.sync.sincronizar();

		// Los dos editan sin conexión; la oficina lo hace después.
		await editar(celular, id, { banco: "BCP" }, "2026-10-12T15:00:00.000Z");
		await editar(oficina, id, { banco: "BBVA" }, "2026-10-12T16:00:00.000Z");

		// El celular sincroniza primero: su cambio sube.
		expect(await celular.sync.sincronizar()).toMatchObject({ subidos: 1, conflictos: [] });
		// La oficina ve que el remoto es más antiguo que el suyo: gana su cambio y lo sube.
		const enOficina = await oficina.sync.sincronizar();
		expect(enOficina.conflictos).toEqual([{ tabla: "terceros", id, ganador: "local" }]);
		expect(sharepoint.leer<Tercero>(`SistemaHM/terceros/${id}.json`)?.banco).toBe("BBVA");
		// Y el celular termina con la versión más reciente.
		await celular.sync.sincronizar();
		expect((await celular.database.terceros.get(id))?.banco).toBe("BBVA");
	});

	it("si el cambio local es más antiguo, se descarta y queda el remoto", async () => {
		const celular = dispositivo();
		const oficina = dispositivo();
		const { id } = await celular.terceros.crear(HUISE, "ana@hm.pe");
		await celular.sync.sincronizar();
		await oficina.sync.sincronizar();

		await editar(oficina, id, { banco: "BBVA" }, "2026-10-12T16:00:00.000Z");
		await oficina.sync.sincronizar();
		await editar(celular, id, { banco: "BCP" }, "2026-10-12T15:00:00.000Z");

		const resultado = await celular.sync.sincronizar();

		expect(resultado.conflictos).toEqual([{ tabla: "terceros", id, ganador: "remoto" }]);
		expect((await celular.database.terceros.get(id))?.banco).toBe("BBVA");
		expect(await celular.database.outbox.count()).toBe(0);
		expect(sharepoint.leer<Tercero>(`SistemaHM/terceros/${id}.json`)?.banco).toBe("BBVA");
	});

	it("resuelve el conflicto aunque el archivo cambie entre la bajada y la subida (412)", async () => {
		const celular = dispositivo();
		const { id } = await celular.terceros.crear(HUISE, "ana@hm.pe");
		await celular.sync.sincronizar();
		await editar(celular, id, { banco: "BCP" }, "2026-10-12T15:00:00.000Z");
		// Alguien lo cambió en SharePoint con una versión más reciente que el celular aún no vio.
		const remoto = sharepoint.leer<Tercero>(`SistemaHM/terceros/${id}.json`);
		const delta = sharepoint.delta.bind(sharepoint);
		jest.spyOn(sharepoint, "delta").mockImplementationOnce(async (...args) => {
			const pagina = await delta(...args);
			sharepoint.escribirDirecto(`SistemaHM/terceros/${id}.json`, {
				...remoto,
				banco: "INTERBANK",
				updatedAt: "2026-10-12T17:00:00.000Z",
			});

			return pagina;
		});

		const resultado = await celular.sync.sincronizar();

		expect(resultado.conflictos).toEqual([{ tabla: "terceros", id, ganador: "remoto" }]);
		expect((await celular.database.terceros.get(id))?.banco).toBe("INTERBANK");
		expect(await celular.database.outbox.count()).toBe(0);
	});

	it("sin conexión conserva lo pendiente para la próxima vez", async () => {
		const celular = dispositivo();
		await celular.terceros.crear(CLIENTE, "ana@hm.pe");
		await celular.sync.sincronizar();
		await celular.terceros.crear(HUISE, "ana@hm.pe");
		sharepoint.conexion = false;

		await expect(celular.sync.sincronizar()).rejects.toBeInstanceOf(SinConexionError);
		expect(await celular.database.outbox.count()).toBe(1);

		sharepoint.conexion = true;
		expect(await celular.sync.sincronizar()).toMatchObject({ subidos: 1 });
		expect(await celular.database.outbox.count()).toBe(0);
	});

	it("ignora con aviso un archivo con datos inválidos", async () => {
		const oficina = dispositivo();
		sharepoint.escribirDirecto("SistemaHM/terceros/roto.json", { id: "roto", razonSocial: 3 });
		sharepoint.escribirDirecto("SistemaHM/otra-cosa/x.json", { id: "x" });
		// Otros archivos del sitio que no son de la app.
		sharepoint.escribirDirecto("Informes/terceros/y.json", { id: "y" });
		sharepoint.escribirDirecto("SistemaHM/terceros/viejos/z.json", { id: "z" });

		const resultado = await oficina.sync.sincronizar();

		expect(resultado.bajados).toBe(0);
		expect(resultado.avisos).toEqual([
			"Se ignoró terceros/roto: los datos no tienen el formato esperado.",
		]);
		expect(await oficina.database.terceros.count()).toBe(0);
	});

	it("sube los PDFs emitidos y guarda su ruta en la valorización", async () => {
		const oficina = dispositivo();
		const ruta = rutaPdf("VAL-0001-2026-CTR-001.pdf", "2026-09-17");
		const valorizacion = {
			id: "val-1",
			contratoId: "ctr-1",
			periodo: "2026-08",
			nombreServicio: "ALQUILER DE EQUIPO PESADO",
			plazoPago: "30 DÍAS",
			gastosGeneralesPct: 0,
			utilidadPct: 0,
			observaciones: "",
			numero: "0001-2026",
			fechaEmision: "2026-09-17",
			estado: "EMITIDA" as const,
			moneda: "USD" as const,
			igvPct: 18,
			fondoGarantiaPct: 0,
			totales: null,
			montoEnLetras: null,
			motivoAnulacion: null,
			anuladaEn: null,
			pdfPath: null,
			createdAt: "2026-09-17T10:00:00.000Z",
			updatedAt: "2026-09-17T10:00:00.000Z",
			updatedBy: "ana@hm.pe",
			deletedAt: null,
			version: 2,
		};
		await oficina.database.valorizaciones.put(valorizacion);
		await oficina.database.archivosPendientes.add({
			ruta,
			archivo: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
			valorizacionId: "val-1",
			createdAt: "2026-09-17T10:00:00.000Z",
		});

		const resultado = await oficina.sync.sincronizar();

		expect(ruta).toBe("SistemaHM/pdf/2026/VAL-0001-2026-CTR-001.pdf");
		expect(resultado.archivos).toBe(1);
		expect(sharepoint.archivos.has(ruta)).toBe(true);
		expect(await oficina.database.archivosPendientes.count()).toBe(0);
		expect((await oficina.database.valorizaciones.get("val-1"))?.pdfPath).toBe(ruta);
		expect(
			sharepoint.leer<{ pdfPath: string }>("SistemaHM/valorizaciones/val-1.json")?.pdfPath,
		).toBe(ruta);
	});

	it("avisa si dos dispositivos emitieron el mismo número", async () => {
		const oficina = dispositivo();
		const base = {
			contratoId: "ctr-1",
			periodo: "2026-08",
			nombreServicio: "ALQUILER DE EQUIPO PESADO",
			plazoPago: "30 DÍAS",
			gastosGeneralesPct: 0,
			utilidadPct: 0,
			observaciones: "",
			numero: "0002-2026",
			fechaEmision: "2026-09-17",
			estado: "EMITIDA" as const,
			moneda: "USD" as const,
			igvPct: 18,
			fondoGarantiaPct: 0,
			totales: null,
			montoEnLetras: null,
			motivoAnulacion: null,
			anuladaEn: null,
			pdfPath: null,
			createdAt: "2026-09-17T10:00:00.000Z",
			updatedAt: "2026-09-17T10:00:00.000Z",
			updatedBy: "ana@hm.pe",
			deletedAt: null,
			version: 2,
		};
		await oficina.database.valorizaciones.bulkPut([
			{ ...base, id: "val-a" },
			{ ...base, id: "val-b", periodo: "2026-09" },
		]);

		const resultado = await oficina.sync.sincronizar();

		expect(resultado.avisos).toContain(
			"Hay 2 valorizaciones emitidas con el número 0002-2026. Anula la que sobra y vuelve a emitirla.",
		);
	});
});
