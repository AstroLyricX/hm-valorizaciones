import { EquipoDatosSchema, nombreEquipo } from "../../../src/features/equipos/domain/equipo";

const EXCAVADORA = {
	tipo: "Excavadora",
	marca: "cat",
	modelo: "340",
	serie: "",
	placa: "",
	anio: "2019",
	propietario: "",
	horometro: "1250,5",
	estado: "OPERATIVO",
	ubicacion: "Asillo - San Antón",
	observaciones: "",
};

describe("EquipoDatosSchema", () => {
	it("pasa a mayúsculas tipo, marca y modelo, y normaliza el horómetro", () => {
		const datos = EquipoDatosSchema.parse(EXCAVADORA);

		expect(datos).toMatchObject({
			tipo: "EXCAVADORA",
			marca: "CAT",
			modelo: "340",
			horometro: "1250.5",
		});
		expect(nombreEquipo(datos)).toBe("EXCAVADORA CAT 340");
	});

	it("acepta los campos opcionales vacíos", () => {
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, anio: "", horometro: "" }).success).toBe(
			true,
		);
	});

	it("rechaza un año fuera de rango, un horómetro inválido y un estado desconocido", () => {
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, anio: "1900" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, horometro: "-5" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "PERDIDO" }).success).toBe(false);
	});
});
