import {
	AdendaDatosSchema,
	siguienteNumeroAdenda,
	textoMotivoAdenda,
} from "../../../src/features/contratos/domain/adenda";

describe("adenda", () => {
	it("guarda el motivo de la lista o lo escrito en «Otro»", () => {
		expect(textoMotivoAdenda({ motivo: "AMPLIACION_PLAZO", detalle: "" })).toBe(
			"Ampliación de plazo",
		);
		expect(textoMotivoAdenda({ motivo: "OTRO", detalle: " Cambio de ubicación de la obra " })).toBe(
			"Cambio de ubicación de la obra",
		);
	});

	it("pide fecha y motivo; con «Otro», el detalle", () => {
		expect(
			AdendaDatosSchema.safeParse({ fecha: "2026-10-15", motivo: "CAMBIO_PRECIOS", detalle: "" })
				.success,
		).toBe(true);
		expect(
			AdendaDatosSchema.safeParse({ fecha: "", motivo: "CAMBIO_PRECIOS", detalle: "" }).success,
		).toBe(false);
		expect(
			AdendaDatosSchema.safeParse({ fecha: "2026-10-15", motivo: "", detalle: "" }).success,
		).toBe(false);
		expect(
			AdendaDatosSchema.safeParse({ fecha: "2026-10-15", motivo: "OTRO", detalle: "" }).success,
		).toBe(false);
	});

	it("numera las adendas de cada contrato desde 1", () => {
		expect(siguienteNumeroAdenda([])).toBe(1);
		expect(siguienteNumeroAdenda([{ numero: 1 }, { numero: 2 }])).toBe(3);
	});
});
