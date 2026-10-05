import { coincide, normalizar } from "../../src/shared/lib/texto";

describe("texto", () => {
	it("normaliza tildes, eñes y mayúsculas", () => {
		expect(normalizar("Ñuñoa CAMIÓN")).toBe("nunoa camion");
	});

	it("coincide si algún campo contiene el texto buscado", () => {
		expect(coincide("camion", ["EQ-001", "CAMIÓN CISTERNA"])).toBe(true);
		expect(coincide("grua", ["EQ-001", "CAMIÓN CISTERNA"])).toBe(false);
		expect(coincide("  ", ["cualquier cosa"])).toBe(true);
	});
});
