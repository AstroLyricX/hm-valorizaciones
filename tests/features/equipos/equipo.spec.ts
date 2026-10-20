import {
	EquipoDatosSchema,
	estadoDeProveedor,
	nombreEquipo,
} from "../../../src/features/equipos/domain/equipo";
import { excavadora } from "../../support/fixtures";

const EXCAVADORA = excavadora("cliente-1", { fabricante: "cat", placa: "exc-340" });

describe("EquipoDatosSchema", () => {
	it("pasa a mayúsculas descripción, fabricante, modelo y placa", () => {
		const datos = EquipoDatosSchema.parse({ ...EXCAVADORA, categoria: "LIVIANO" });

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

	it("la placa solo aplica a los livianos: un pesado no la lleva", () => {
		const liviano = { ...EXCAVADORA, categoria: "LIVIANO" as const };

		expect(EquipoDatosSchema.safeParse({ ...liviano, placa: "" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, placa: "" }).success).toBe(true);
		expect(EquipoDatosSchema.parse(EXCAVADORA).placa).toBe("");
	});

	it("exige año, dueño y un estado conocido", () => {
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, anio: "1900" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, duenoId: "" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "OPERATIVO" }).success).toBe(false);
	});

	it("un equipo propio no necesita proveedor y no conserva uno", () => {
		const propio = EquipoDatosSchema.parse({ ...EXCAVADORA, propiedad: "PROPIO", estado: "P" });

		expect(propio).toMatchObject({ propiedad: "PROPIO", duenoId: "" });
		expect(
			EquipoDatosSchema.safeParse({ ...EXCAVADORA, propiedad: "PROPIO", estado: "P", duenoId: "" })
				.success,
		).toBe(true);
	});

	it("cada dueño tiene su lista de estados", () => {
		const propio = { ...EXCAVADORA, propiedad: "PROPIO" as const };

		expect(EquipoDatosSchema.safeParse({ ...propio, estado: "SB" }).success).toBe(true);
		expect(EquipoDatosSchema.safeParse({ ...propio, estado: "EO" }).success).toBe(false);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "EO" }).success).toBe(true);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "SB" }).success).toBe(false);
		// La falla mecánica vale para los dos.
		expect(EquipoDatosSchema.safeParse({ ...propio, estado: "FM" }).success).toBe(true);
		expect(EquipoDatosSchema.safeParse({ ...EXCAVADORA, estado: "FM" }).success).toBe(true);
	});

	it("traduce los estados antiguos de un equipo de proveedor", () => {
		expect(estadoDeProveedor("P")).toBe("PR");
		expect(estadoDeProveedor("SB")).toBe("EO");
		expect(estadoDeProveedor("OP")).toBe("EO");
		expect(estadoDeProveedor("FM")).toBe("FM");
		expect(estadoDeProveedor("FO")).toBe("DV");
		expect(estadoDeProveedor("D")).toBe("DV");
	});
});
