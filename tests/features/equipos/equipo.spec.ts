import { EquipoDatosSchema, nombreEquipo } from "../../../src/features/equipos/domain/equipo";
import { excavadora } from "../../support/fixtures";

const EXCAVADORA = excavadora("cliente-1", { fabricante: "cat", placa: "exc-340" });

describe("EquipoDatosSchema", () => {
	it("pasa a mayúsculas descripción, fabricante, modelo y placa", () => {
		const datos = EquipoDatosSchema.parse(EXCAVADORA);

		expect(datos).toMatchObject({
			descripcion: "EXCAVADORA",
			fabricante: "CAT",
			modelo: "340",
			placa: "EXC-340",
		});
		expect(nombreEquipo(datos)).toBe("EXCAVADORA CAT 340");
	});

	it("acepta vacías la serie del equipo, el tipo y la serie del motor", () => {
		expect(EquipoDatosSchema.safeParse(EXCAVADORA).success).toBe(true);
	});

	it("exige placa, año, dueño y un estado conocido", () => {
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, placa: "" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, anio: "1900" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, duenoId: "" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "OPERATIVO" }).success).toBe(false);
	});
});
