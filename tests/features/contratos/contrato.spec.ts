import {
	ContratoDatosSchema,
	diasParaVencer,
	estadoContrato,
	esVigente,
	montoContractual,
	montosConIgv,
	parcialEquipo,
	periodoEnVigencia,
	textoVencimiento,
	vigenciaContrato,
} from "../../../src/features/contratos/domain/contrato";
import {
	ContratoFormSchema,
	FORMULARIO_VACIO,
	parcialEnVivo,
} from "../../../src/features/contratos/ui/contratoForm";
import { contratoDatos, equipoDelContrato } from "./fixtures";

describe("cálculos del contrato", () => {
	it("parcial = horas mínimas × costo por hora (caso del xlsm)", () => {
		expect(parcialEquipo(equipoDelContrato("eq-1"))).toBe(705000);
	});

	it("redondea al centavo con horas decimales", () => {
		expect(parcialEquipo({ horasMinimas: "53.23", costoHora: 4700 })).toBe(250181);
	});

	it("el monto contractual suma todos los equipos", () => {
		expect(
			montoContractual([
				equipoDelContrato("eq-1"),
				equipoDelContrato("eq-2", { horasMinimas: "200", costoHora: 8500 }),
			]),
		).toBe(705000 + 1700000);
	});

	it("el contrato vence cuando pasa la fecha de fin", () => {
		expect(estadoContrato({ fechaFin: "2026-12-31" }, "2026-12-31")).toBe("ACTIVO");
		expect(estadoContrato({ fechaFin: "2026-12-31" }, "2027-01-01")).toBe("VENCIDO");
	});
});

describe("vigencia del contrato", () => {
	const CONTRATO = { fechaInicio: "2026-08-01", fechaFin: "2026-12-31" };

	it("está por iniciar, vigente, por vencer la última semana o vencido", () => {
		expect(vigenciaContrato(CONTRATO, "2026-07-31")).toBe("POR_INICIAR");
		expect(vigenciaContrato(CONTRATO, "2026-08-01")).toBe("VIGENTE");
		expect(vigenciaContrato(CONTRATO, "2026-12-23")).toBe("VIGENTE");
		expect(vigenciaContrato(CONTRATO, "2026-12-24")).toBe("POR_VENCER");
		expect(vigenciaContrato(CONTRATO, "2026-12-31")).toBe("POR_VENCER");
		expect(vigenciaContrato(CONTRATO, "2027-01-01")).toBe("VENCIDO");
	});

	it("solo admite valorizaciones mientras está vigente", () => {
		expect(esVigente(CONTRATO, "2026-07-31")).toBe(false);
		expect(esVigente(CONTRATO, "2026-12-31")).toBe(true);
		expect(esVigente(CONTRATO, "2027-01-01")).toBe(false);
	});

	it("cuenta los días que faltan, también entre meses y años", () => {
		expect(diasParaVencer(CONTRATO, "2026-12-31")).toBe(0);
		expect(diasParaVencer(CONTRATO, "2026-12-24")).toBe(7);
		expect(diasParaVencer({ fechaFin: "2026-03-02" }, "2026-02-27")).toBe(3);
		expect(diasParaVencer(CONTRATO, "2027-01-02")).toBe(-2);
		expect(textoVencimiento(0)).toBe("Vence hoy");
		expect(textoVencimiento(1)).toBe("Vence mañana");
		expect(textoVencimiento(5)).toBe("Vence en 5 días");
	});

	it("el periodo debe caer dentro de la vigencia", () => {
		const aMitadDeMes = { fechaInicio: "2026-08-15", fechaFin: "2026-12-10" };

		expect(periodoEnVigencia(aMitadDeMes, "2026-07")).toBe(false);
		expect(periodoEnVigencia(aMitadDeMes, "2026-08")).toBe(true);
		expect(periodoEnVigencia(aMitadDeMes, "2026-12")).toBe(true);
		expect(periodoEnVigencia(aMitadDeMes, "2027-01")).toBe(false);
	});
});

describe("ContratoDatosSchema", () => {
	it("acepta el contrato del xlsm y pasa proyecto y ubicación a mayúsculas", () => {
		const datos = ContratoDatosSchema.parse(contratoDatos("cli-1", "eq-1"));

		expect(datos.proyecto).toBe("GESTIÓN GENERAL DE SUBCONTRATOS - OSUR");
		expect(datos.ubicacion).toBe("ASILLO - SAN ANTÓN");
	});

	it("exige fecha de fin igual o posterior a la de inicio", () => {
		const resultado = ContratoDatosSchema.safeParse(
			contratoDatos("cli-1", "eq-1", { fechaFin: "2026-07-01" }),
		);

		expect(resultado.error?.issues[0]?.path).toEqual(["fechaFin"]);
	});

	it("exige al menos un equipo y no permite repetirlo", () => {
		expect(
			ContratoDatosSchema.safeParse(contratoDatos("cli-1", "eq-1", { equipos: [] })).success,
		).toBe(false);

		const repetido = ContratoDatosSchema.safeParse(
			contratoDatos("cli-1", "eq-1", {
				equipos: [equipoDelContrato("eq-1"), equipoDelContrato("eq-1")],
			}),
		);
		// El error queda en el ítem repetido (el segundo), con el ítem donde ya está.
		expect(repetido.error?.issues[0]).toMatchObject({
			message: "Este equipo ya está en el ítem 1.",
			path: ["equipos", 1, "equipoId"],
		});
	});

	it("calcula el IGV referencial sobre el monto contractual", () => {
		// USD 7,050.00 + 18 % = USD 8,319.00
		expect(montosConIgv(705000, 18)).toEqual({ subtotal: 705000, igv: 126900, total: 831900 });
		// Redondeo al centavo: 0.18 × 0.05 = 0.009 → 0.01
		expect(montosConIgv(5, 18)).toEqual({ subtotal: 5, igv: 1, total: 6 });
		expect(montosConIgv(705000, 0).total).toBe(705000);
	});
});

describe("ContratoFormSchema", () => {
	it("convierte textos a números, admite coma decimal y fondo de garantía vacío", () => {
		const datos = ContratoFormSchema.parse({
			...FORMULARIO_VACIO,
			terceroId: "cli-1",
			proyecto: "OSUR",
			ubicacion: "Asillo",
			fechaInicio: "2026-08-01",
			fechaFin: "2026-12-31",
			equipos: [{ equipoId: "eq-1", horasMinimas: "150", costoHora: "47,00" }],
		});

		expect(datos.fondoGarantiaPct).toBe(0);
		expect(datos.equipos[0]).toMatchObject({ horasMinimas: "150", costoHora: 4700 });
	});

	it("muestra todos los errores a la vez", () => {
		const resultado = ContratoFormSchema.safeParse({
			...FORMULARIO_VACIO,
			equipos: [{ equipoId: "", horasMinimas: "", costoHora: "abc" }],
		});
		const rutas = resultado.error?.issues.map((issue) => issue.path.join(".")) ?? [];

		expect(rutas).toEqual(
			expect.arrayContaining([
				"terceroId",
				"proyecto",
				"ubicacion",
				"fechaInicio",
				"fechaFin",
				"equipos.0.equipoId",
				"equipos.0.horasMinimas",
				"equipos.0.costoHora",
			]),
		);
	});

	it("calcula el parcial mientras se escribe", () => {
		expect(parcialEnVivo({ horasMinimas: "53,23", costoHora: "47" })).toBe(250181);
		expect(parcialEnVivo({ horasMinimas: "", costoHora: "47" })).toBe(0);
	});
});
