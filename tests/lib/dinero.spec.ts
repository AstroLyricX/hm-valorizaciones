import { aCentavos, deCentavos, formatearMoneda } from "../../src/lib/dinero";

describe("dinero", () => {
	it("convierte montos a centavos sin errores de punto flotante", () => {
		expect(aCentavos("2501.81")).toBe(250181);
		expect(aCentavos(0.1 + 0.2)).toBe(30);
		expect(aCentavos("450.325")).toBe(45033);
	});

	it("convierte centavos a texto con 2 decimales", () => {
		expect(deCentavos(295214)).toBe("2952.14");
		expect(deCentavos(-82861)).toBe("-828.61");
	});

	it("formatea en soles y dólares", () => {
		expect(formatearMoneda(295214, "USD")).toBe("USD 2,952.14");
		expect(formatearMoneda(100000, "PEN")).toBe("S/ 1,000.00");
	});
});
