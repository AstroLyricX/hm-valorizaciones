import { siguienteCodigo, TerceroDatosSchema } from "../../../src/features/clientes/domain/tercero";

const DATOS = {
	tipo: "CLIENTE",
	razonSocial: "Huise Quea Antolin",
	ruc: "10098637074",
	direccion: "",
	contacto: "",
	telefono: "",
	correo: "",
};

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
	it("guarda la razón social en mayúsculas y el correo en minúsculas", () => {
		const datos = TerceroDatosSchema.parse({ ...DATOS, correo: "Ventas@Empresa.PE" });

		expect(datos.razonSocial).toBe("HUISE QUEA ANTOLIN");
		expect(datos.correo).toBe("ventas@empresa.pe");
	});

	it("acepta campos opcionales vacíos", () => {
		expect(TerceroDatosSchema.safeParse(DATOS).success).toBe(true);
	});

	it("rechaza un correo inválido y un RUC con dígito verificador incorrecto", () => {
		expect(TerceroDatosSchema.safeParse({ ...DATOS, correo: "ventas@" }).success).toBe(false);
		expect(TerceroDatosSchema.safeParse({ ...DATOS, ruc: "20123456789" }).success).toBe(false);
	});
});
