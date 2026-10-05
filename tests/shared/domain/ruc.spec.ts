import { rucValido } from "../../../src/shared/domain/ruc";

describe("rucValido", () => {
	it.each([
		["20602629903", "empresa (H&M)"],
		["10098637074", "persona natural (proveedor del xlsm)"],
	])("acepta el RUC %s de %s", (ruc) => {
		expect(rucValido(ruc)).toBe(true);
	});

	it("rechaza un RUC con dígito verificador incorrecto", () => {
		expect(rucValido("20602629904")).toBe(false);
		expect(rucValido("20123456789")).toBe(false);
	});

	it("rechaza un RUC con longitud incorrecta", () => {
		expect(rucValido("2060262990")).toBe(false);
		expect(rucValido("206026299031")).toBe(false);
	});

	it("rechaza un prefijo no permitido o caracteres no numéricos", () => {
		expect(rucValido("30602629903")).toBe(false);
		expect(rucValido("2060262990A")).toBe(false);
	});
});
