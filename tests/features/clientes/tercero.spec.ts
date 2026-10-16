import {
	siguienteCodigo,
	sugerirPrefijo,
	TerceroDatosSchema,
} from "../../../src/features/clientes/domain/tercero";
import { HUISE } from "../../support/fixtures";

describe("siguienteCodigo", () => {
	it("empieza en CLI-001", () => {
		expect(siguienteCodigo([])).toBe("CLI-001");
	});

	it("continúa desde el código mayor aunque haya huecos", () => {
		expect(siguienteCodigo(["CLI-001", "CLI-007", "CLI-003"])).toBe("CLI-008");
	});

	it("ignora códigos con otro formato y pasa de 999", () => {
		expect(siguienteCodigo(["EQ-050", "CLI-999"])).toBe("CLI-1000");
	});
});

describe("TerceroDatosSchema", () => {
	it("guarda la razón social y el representante en mayúsculas y el correo en minúsculas", () => {
		const datos = TerceroDatosSchema.parse({ ...HUISE, correo: "Ventas@Empresa.PE" });

		expect(datos.razonSocial).toBe("HUISE QUEA ANTOLIN");
		expect(datos.representanteNombre).toBe("ANTOLIN HUISE QUEA");
		expect(datos.correo).toBe("ventas@empresa.pe");
	});

	it("acepta vacíos los datos bancarios y los opcionales del representante", () => {
		expect(TerceroDatosSchema.safeParse(HUISE).success).toBe(true);
	});

	it("exige correo, DNI de 8 dígitos y teléfono del representante", () => {
		expect(TerceroDatosSchema.safeParse({ ...HUISE, correo: "" }).success).toBe(false);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, representanteDni: "1234" }).success).toBe(
			false,
		);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, representanteTelefono: "" }).success).toBe(
			false,
		);
	});

	it("rechaza un RUC con dígito verificador incorrecto y un CCI incompleto", () => {
		expect(TerceroDatosSchema.safeParse({ ...HUISE, ruc: "20123456789" }).success).toBe(false);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, cci: "0021" }).success).toBe(false);
	});
});

describe("sugerirPrefijo", () => {
	it("usa las iniciales de la razón social sin la forma societaria", () => {
		expect(sugerirPrefijo("HUISE QUEA ANTOLIN")).toBe("HQA");
		expect(sugerirPrefijo("Constructora Andina S.A.C.")).toBe("CA");
		expect(sugerirPrefijo("MAQUINARIAS DEL SUR E.I.R.L.")).toBe("MS");
	});

	it("con una sola palabra usa sus primeras letras", () => {
		expect(sugerirPrefijo("MAQSUR SAC")).toBe("MAQ");
		expect(sugerirPrefijo("Ñuñez")).toBe("NUN");
	});

	it("no repite un código usado ni el HM de H&M", () => {
		expect(sugerirPrefijo("HUISE QUEA ANTOLIN", ["HQA"])).toBe("HUI");
		expect(sugerirPrefijo("HUISE QUEA ANTOLIN", ["HQA", "HUI", "HUIS"])).toBe("HUIA");
		expect(sugerirPrefijo("HERMANOS MAMANI")).toBe("HER");
	});
});

describe("código de equipos", () => {
	it("acepta de 2 a 4 letras, en mayúsculas, o vacío", () => {
		expect(TerceroDatosSchema.parse({ ...HUISE, prefijoEquipos: "hqa" }).prefijoEquipos).toBe(
			"HQA",
		);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, prefijoEquipos: "" }).success).toBe(true);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, prefijoEquipos: "H1" }).success).toBe(false);
		expect(TerceroDatosSchema.safeParse({ ...HUISE, prefijoEquipos: "HUISE" }).success).toBe(false);
	});

	it("no permite HM, que es de los equipos propios", () => {
		expect(TerceroDatosSchema.safeParse({ ...HUISE, prefijoEquipos: "hm" }).success).toBe(false);
	});
});
