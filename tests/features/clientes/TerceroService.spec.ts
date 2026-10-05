import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { RucDuplicadoError } from "../../../src/features/clientes/domain/tercero";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";

const HUISE = {
	tipo: "PROVEEDOR" as const,
	razonSocial: "Huise Quea Antolin",
	ruc: "10098637074",
	direccion: "Jr. Bellavista S/N - Ollachea",
	contacto: "",
	telefono: "931 161 371",
	correo: "",
};
const HM = {
	...HUISE,
	tipo: "CLIENTE" as const,
	razonSocial: "Cliente de prueba",
	ruc: "20602629903",
};

let database: HmDatabase;
let service: TerceroService;

beforeEach(() => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	service = new TerceroService(new TerceroRepository(database));
});

afterEach(async () => {
	await database.delete();
});

describe("TerceroService", () => {
	it("registra con código correlativo, estado activo y versión 1", async () => {
		const primero = await service.crear(HUISE, "ana@hm.pe");
		const segundo = await service.crear(HM, "ana@hm.pe");

		expect(primero).toMatchObject({
			codigo: "CLI-001",
			estado: "ACTIVO",
			version: 1,
			razonSocial: "HUISE QUEA ANTOLIN",
		});
		expect(segundo.codigo).toBe("CLI-002");
		expect(await service.listar()).toHaveLength(2);
	});

	it("no permite registrar dos veces el mismo RUC", async () => {
		await service.crear(HUISE, "ana@hm.pe");

		await expect(
			service.crear({ ...HUISE, razonSocial: "Otro nombre" }, "ana@hm.pe"),
		).rejects.toBeInstanceOf(RucDuplicadoError);
		expect(await database.terceros.count()).toBe(1);
	});

	it("permite editar sin cambiar el RUC, pero no usar el RUC de otro registro", async () => {
		const huise = await service.crear(HUISE, "ana@hm.pe");
		await service.crear(HM, "ana@hm.pe");

		const editado = await service.actualizar(
			huise.id,
			{ ...HUISE, contacto: "Antolín" },
			"luis@hm.pe",
		);
		expect(editado).toMatchObject({
			contacto: "Antolín",
			version: 2,
			updatedBy: "luis@hm.pe",
			codigo: "CLI-001",
		});

		await expect(
			service.actualizar(huise.id, { ...HUISE, ruc: HM.ruc }, "luis@hm.pe"),
		).rejects.toThrow("ya está registrado (CLI-002)");
	});

	it("desactiva y reactiva sin borrar el registro", async () => {
		const huise = await service.crear(HUISE, "ana@hm.pe");

		const inactivo = await service.cambiarEstado(huise.id, "INACTIVO", "ana@hm.pe");
		expect(inactivo.estado).toBe("INACTIVO");
		expect(await service.listar()).toHaveLength(1);

		expect((await service.cambiarEstado(huise.id, "ACTIVO", "ana@hm.pe")).version).toBe(3);
	});

	it("deja cada cambio pendiente de sincronizar", async () => {
		const huise = await service.crear(HUISE, "ana@hm.pe");
		await service.cambiarEstado(huise.id, "INACTIVO", "ana@hm.pe");

		const pendientes = await database.outbox.where("entidad").equals("terceros").toArray();
		expect(pendientes).toHaveLength(2);
	});
});
