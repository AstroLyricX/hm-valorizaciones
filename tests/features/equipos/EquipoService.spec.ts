import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import { PlacaDuplicadaError } from "../../../src/features/equipos/domain/equipo";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import { CLIENTE, excavadora, HUISE, volquete } from "../../support/fixtures";

let database: HmDatabase;
let service: EquipoService;
let proveedores: TerceroService;
let EXCAVADORA: ReturnType<typeof excavadora>;
let VOLQUETE: ReturnType<typeof volquete>;

beforeEach(async () => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	const terceros = new TerceroRepository(database);
	service = new EquipoService(new EquipoRepository(database), terceros);
	proveedores = new TerceroService(terceros, "PROVEEDOR");
	// HUISE QUEA ANTOLIN: su código de equipos es HQA.
	const huiseId = (await proveedores.crear(HUISE, "ana@hm.pe")).id;
	EXCAVADORA = excavadora(huiseId);
	VOLQUETE = volquete(huiseId, { placa: "abc-123" });
});

afterEach(async () => {
	await database.delete();
});

describe("EquipoService", () => {
	it("asigna el activo fijo con el código del proveedor y un número correlativo", async () => {
		const primero = await service.crear(EXCAVADORA, "ana@hm.pe");
		const segundo = await service.crear(VOLQUETE, "ana@hm.pe");

		expect(primero).toMatchObject({ activoFijo: "HQA001", version: 1, descripcion: "EXCAVADORA" });
		expect(segundo).toMatchObject({ activoFijo: "HQA002", placa: "ABC-123" });
		expect(await service.listar()).toHaveLength(2);
	});

	it("los equipos propios usan HM y cada dueño lleva su propia numeración", async () => {
		await service.crear(EXCAVADORA, "ana@hm.pe");
		const propio = await service.crear(
			excavadora("", { propiedad: "PROPIO", placa: "HM-001" }),
			"ana@hm.pe",
		);
		const andinaId = (await proveedores.crear({ ...CLIENTE, prefijoEquipos: "and" }, "ana@hm.pe"))
			.id;
		const deAndina = await service.crear(volquete(andinaId, { placa: "AND-001" }), "ana@hm.pe");

		expect(propio.activoFijo).toBe("HM001");
		expect(deAndina.activoFijo).toBe("AND001");
		expect(await service.siguienteActivoFijo({ propiedad: "PROPIO", duenoId: "" })).toBe("HM002");
	});

	it("continúa desde el número mayor del dueño", async () => {
		await service.crear(EXCAVADORA, "ana@hm.pe");
		await database.equipos.toCollection().modify({ activoFijo: "HQA014" });

		expect((await service.crear(VOLQUETE, "ana@hm.pe")).activoFijo).toBe("HQA015");
	});

	it("solo cambia el activo fijo si el equipo pasa a otro dueño", async () => {
		const equipo = await service.crear(EXCAVADORA, "ana@hm.pe");

		const conObservacion = await service.actualizar(
			equipo.id,
			{ ...EXCAVADORA, observaciones: "Llantas nuevas" },
			"ana@hm.pe",
		);
		const propio = await service.actualizar(
			equipo.id,
			{ ...EXCAVADORA, propiedad: "PROPIO", estado: "P" },
			"ana@hm.pe",
		);

		expect(conObservacion.activoFijo).toBe("HQA001");
		expect(propio.activoFijo).toBe("HM001");
	});

	it("no permite repetir la placa de un liviano; los pesados no llevan placa", async () => {
		await service.crear(VOLQUETE, "ana@hm.pe");

		await expect(
			service.crear({ ...VOLQUETE, modelo: "FH", placa: "abc-123" }, "ana@hm.pe"),
		).rejects.toBeInstanceOf(PlacaDuplicadaError);
		// Dos pesados sin placa no chocan.
		await service.crear(EXCAVADORA, "ana@hm.pe");
		await service.crear({ ...EXCAVADORA, modelo: "320" }, "ana@hm.pe");
		expect(await database.equipos.count()).toBe(3);
	});

	it("cambia el estado conservando el activo fijo", async () => {
		const equipo = await service.crear(EXCAVADORA, "ana@hm.pe");

		const actualizado = await service.actualizar(
			equipo.id,
			{ ...EXCAVADORA, estado: "FM" },
			"luis@hm.pe",
		);

		expect(actualizado).toMatchObject({
			activoFijo: "HQA001",
			estado: "FM",
			version: 2,
			updatedBy: "luis@hm.pe",
		});
	});

	it("al editar puede conservar su propia placa y activo fijo", async () => {
		const volqueteCreado = await service.crear(VOLQUETE, "ana@hm.pe");

		await expect(
			service.actualizar(
				volqueteCreado.id,
				{ ...VOLQUETE, observaciones: "Llantas nuevas" },
				"ana@hm.pe",
			),
		).resolves.toMatchObject({ observaciones: "Llantas nuevas" });
	});

	it("deja cada cambio pendiente de sincronizar", async () => {
		const equipo = await service.crear(EXCAVADORA, "ana@hm.pe");
		await service.actualizar(equipo.id, { ...EXCAVADORA, estado: "EO" }, "ana@hm.pe");

		expect(await database.outbox.where("entidad").equals("equipos").count()).toBe(2);
	});
});
