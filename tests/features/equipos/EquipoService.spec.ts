import { HmDatabase } from "../../../src/data/db";
import {
	EquipoService,
	PlacaDuplicadaError,
} from "../../../src/features/equipos/application/EquipoService";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";

const EXCAVADORA = {
	tipo: "Excavadora",
	marca: "CAT",
	modelo: "340",
	serie: "",
	placa: "",
	anio: "",
	propietario: "",
	horometro: "",
	estado: "OPERATIVO" as const,
	ubicacion: "",
	observaciones: "",
};
const VOLQUETE = {
	...EXCAVADORA,
	tipo: "Volquete",
	marca: "Volvo",
	modelo: "FMX",
	placa: "abc-123",
};

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
	it("registra con código correlativo EQ-001, EQ-002", async () => {
		const primero = await service.crear(EXCAVADORA, "ana@hm.pe");
		const segundo = await service.crear(VOLQUETE, "ana@hm.pe");

		expect(primero).toMatchObject({ codigo: "EQ-001", version: 1, tipo: "EXCAVADORA" });
		expect(segundo).toMatchObject({ codigo: "EQ-002", placa: "ABC-123" });
	});

	it("permite varios equipos sin placa, pero no dos con la misma placa", async () => {
		await service.crear(EXCAVADORA, "ana@hm.pe");
		await service.crear(EXCAVADORA, "ana@hm.pe");
		await service.crear(VOLQUETE, "ana@hm.pe");

		await expect(
			service.crear({ ...VOLQUETE, placa: "ABC-123" }, "ana@hm.pe"),
		).rejects.toBeInstanceOf(PlacaDuplicadaError);
		expect(await database.equipos.count()).toBe(3);
	});

	it("cambia el estado y el horómetro, conservando el código", async () => {
		const equipo = await service.crear(EXCAVADORA, "ana@hm.pe");

		const actualizado = await service.actualizar(
			equipo.id,
			{ ...EXCAVADORA, estado: "EN_MANTENIMIENTO", horometro: "1320.25" },
			"luis@hm.pe",
		);

		expect(actualizado).toMatchObject({
			codigo: "EQ-001",
			estado: "EN_MANTENIMIENTO",
			horometro: "1320.25",
			version: 2,
			updatedBy: "luis@hm.pe",
		});
	});

	it("al editar puede conservar su propia placa", async () => {
		const volquete = await service.crear(VOLQUETE, "ana@hm.pe");

		await expect(
			service.actualizar(volquete.id, { ...VOLQUETE, ubicacion: "Ollachea" }, "ana@hm.pe"),
		).resolves.toMatchObject({
			ubicacion: "Ollachea",
		});
	});
});
