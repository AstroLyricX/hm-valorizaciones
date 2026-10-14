import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { RucDuplicadoError } from "../../../src/features/clientes/domain/tercero";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { CLIENTE, HUISE } from "../../support/fixtures";

const HM = { ...CLIENTE, razonSocial: "Cliente de prueba" };

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
	it("registra con código correlativo, el estado elegido y versión 1", async () => {
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

		const editado = await service.actualizar(huise.id, { ...HUISE, banco: "BCP" }, "luis@hm.pe");
		expect(editado).toMatchObject({
			banco: "BCP",
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

	describe("proveedores", () => {
		let proveedores: TerceroService;

		beforeEach(() => {
			proveedores = new TerceroService(new TerceroRepository(database), "PROVEEDOR");
		});

		it("tienen su propio correlativo PRO-001 y su propia lista", async () => {
			await service.crear(HM, "ana@hm.pe");
			const proveedor = await proveedores.crear(HUISE, "ana@hm.pe");

			expect(proveedor).toMatchObject({ tipo: "PROVEEDOR", codigo: "PRO-001" });
			expect((await proveedores.listar()).map((tercero) => tercero.codigo)).toEqual(["PRO-001"]);
			expect((await service.listar()).map((tercero) => tercero.codigo)).toEqual(["CLI-001"]);
		});

		it("una empresa puede ser cliente y proveedor, pero no repetirse en la misma lista", async () => {
			await service.crear(HUISE, "ana@hm.pe");
			await expect(proveedores.crear(HUISE, "ana@hm.pe")).resolves.toMatchObject({
				codigo: "PRO-001",
			});

			await expect(
				proveedores.crear({ ...HUISE, razonSocial: "Otro nombre" }, "ana@hm.pe"),
			).rejects.toThrow("ya está registrado (PRO-001)");
		});

		it("cada servicio solo modifica los registros de su lista", async () => {
			const cliente = await service.crear(HUISE, "ana@hm.pe");

			await expect(
				proveedores.cambiarEstado(cliente.id, "INACTIVO", "ana@hm.pe"),
			).rejects.toThrow();
		});
	});
});
