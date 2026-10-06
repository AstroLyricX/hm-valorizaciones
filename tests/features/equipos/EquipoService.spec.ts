import { HmDatabase } from "../../../src/data/db";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import {
	ActivoFijoDuplicadoError,
	PlacaDuplicadaError,
} from "../../../src/features/equipos/domain/equipo";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import { excavadora, volquete } from "../../support/fixtures";

const EXCAVADORA = excavadora("cliente-1");
const VOLQUETE = volquete("cliente-1", { placa: "abc-123" });

let database: HmDatabase;
let service: EquipoService;

beforeEach(() => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	service = new EquipoService(new EquipoRepository(database));
});

afterEach(async () => {
	await database.delete();
});

describe("EquipoService", () => {
	it("registra los equipos en mayúsculas y con versión 1", async () => {
		const primero = await service.crear(EXCAVADORA, "ana@hm.pe");
		const segundo = await service.crear(VOLQUETE, "ana@hm.pe");

		expect(primero).toMatchObject({ activoFijo: "AF-001", version: 1, descripcion: "EXCAVADORA" });
		expect(segundo).toMatchObject({ activoFijo: "AF-002", placa: "ABC-123" });
		expect(await service.listar()).toHaveLength(2);
	});

	it("no permite repetir el activo fijo ni la placa", async () => {
		await service.crear(EXCAVADORA, "ana@hm.pe");

		await expect(
			service.crear({ ...VOLQUETE, activoFijo: "af-001" }, "ana@hm.pe"),
		).rejects.toBeInstanceOf(ActivoFijoDuplicadoError);
		await expect(
			service.crear({ ...VOLQUETE, placa: "EXC-340" }, "ana@hm.pe"),
		).rejects.toBeInstanceOf(PlacaDuplicadaError);
		expect(await database.equipos.count()).toBe(1);
	});

	it("cambia el estado conservando el activo fijo", async () => {
		const equipo = await service.crear(EXCAVADORA, "ana@hm.pe");

		const actualizado = await service.actualizar(
			equipo.id,
			{ ...EXCAVADORA, estado: "FM" },
			"luis@hm.pe",
		);

		expect(actualizado).toMatchObject({
			activoFijo: "AF-001",
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
		await service.actualizar(equipo.id, { ...EXCAVADORA, estado: "SB" }, "ana@hm.pe");

		expect(await database.outbox.where("entidad").equals("equipos").count()).toBe(2);
	});
});
