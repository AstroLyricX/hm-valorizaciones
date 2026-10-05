import { HmDatabase } from "../../../src/data/db";
import { EmpresaService } from "../../../src/features/configuracion/application/EmpresaService";
import { EMPRESA_INICIAL } from "../../../src/features/configuracion/domain/empresa";
import { EmpresaRepository } from "../../../src/features/configuracion/infrastructure/EmpresaRepository";

let database: HmDatabase;
let service: EmpresaService;

beforeEach(() => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	service = new EmpresaService(new EmpresaRepository(database));
});

afterEach(async () => {
	await database.delete();
});

describe("EmpresaService", () => {
	it("crea los datos iniciales de la hoja CONFIG la primera vez", async () => {
		const empresa = await service.obtener();

		expect(empresa).toMatchObject({ ...EMPRESA_INICIAL, version: 1, deletedAt: null });
		expect(await database.empresa.count()).toBe(1);
	});

	it("no duplica los datos al consultarlos de nuevo", async () => {
		await service.obtener();
		await service.obtener();

		expect(await database.empresa.count()).toBe(1);
		expect(await database.outbox.count()).toBe(1);
	});

	it("actualiza los datos, sube la versión y registra quién los cambió", async () => {
		const inicial = await service.obtener();

		const actualizada = await service.actualizar(
			{ ...EMPRESA_INICIAL, telefono: "951 000 111", igvPorcentaje: 10.5 },
			"ana@hm.pe",
		);

		expect(actualizada).toMatchObject({
			telefono: "951 000 111",
			igvPorcentaje: 10.5,
			updatedBy: "ana@hm.pe",
			version: inicial.version + 1,
			createdAt: inicial.createdAt,
		});
		expect(await database.empresa.get("empresa")).toEqual(actualizada);
	});

	it("deja cada cambio pendiente de sincronizar en el outbox", async () => {
		await service.obtener();
		await service.actualizar(EMPRESA_INICIAL, "ana@hm.pe");

		const pendientes = await database.outbox.toArray();
		expect(pendientes).toHaveLength(2);
		expect(pendientes[1]).toMatchObject({
			entidad: "empresa",
			registroId: "empresa",
			operacion: "upsert",
		});
	});

	it("rechaza un RUC inválido sin guardar nada", async () => {
		await service.obtener();

		await expect(
			service.actualizar({ ...EMPRESA_INICIAL, ruc: "20123456789" }, "ana@hm.pe"),
		).rejects.toThrow();
		expect((await database.empresa.get("empresa"))?.ruc).toBe(EMPRESA_INICIAL.ruc);
	});

	it("rechaza un IGV fuera de rango", async () => {
		await expect(
			service.actualizar({ ...EMPRESA_INICIAL, igvPorcentaje: 120 }, "ana@hm.pe"),
		).rejects.toThrow();
	});
});
