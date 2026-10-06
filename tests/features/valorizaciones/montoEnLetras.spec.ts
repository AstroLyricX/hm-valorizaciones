import {
	montoEnLetras,
	numeroEnLetras,
} from "../../../src/features/valorizaciones/domain/montoEnLetras";

describe("montoEnLetras", () => {
	it("escribe el total de la hoja VALORIZACION del xlsm", () => {
		expect(montoEnLetras(295214, "USD")).toBe(
			"DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS.",
		);
	});

	it("usa SOLES para montos en soles y completa los céntimos con dos dígitos", () => {
		expect(montoEnLetras(100005, "PEN")).toBe("MIL CON 05/100 SOLES.");
		expect(montoEnLetras(0, "PEN")).toBe("CERO CON 00/100 SOLES.");
	});

	it("rechaza montos negativos o con fracciones de centavo", () => {
		expect(() => montoEnLetras(-1, "USD")).toThrow(RangeError);
		expect(() => montoEnLetras(10.5, "USD")).toThrow(RangeError);
	});
});

describe("numeroEnLetras", () => {
	it.each([
		[1, "UNO"],
		[15, "QUINCE"],
		[16, "DIECISÉIS"],
		[21, "VEINTIUNO"],
		[22, "VEINTIDÓS"],
		[30, "TREINTA"],
		[31, "TREINTA Y UNO"],
		[100, "CIEN"],
		[101, "CIENTO UNO"],
		[115, "CIENTO QUINCE"],
		[500, "QUINIENTOS"],
		[999, "NOVECIENTOS NOVENTA Y NUEVE"],
		[1000, "MIL"],
		[1001, "MIL UNO"],
		[2952, "DOS MIL NOVECIENTOS CINCUENTA Y DOS"],
		[21000, "VEINTIÚN MIL"],
		[31000, "TREINTA Y UN MIL"],
		[100000, "CIEN MIL"],
		[101000, "CIENTO UN MIL"],
		[1000000, "UN MILLÓN"],
		[2500000, "DOS MILLONES QUINIENTOS MIL"],
		[21000000, "VEINTIÚN MILLONES"],
		[1001001, "UN MILLÓN MIL UNO"],
	])("%i → %s", (numero, letras) => {
		expect(numeroEnLetras(numero)).toBe(letras);
	});
});
