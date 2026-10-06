import {
	calcularValorizacion,
	formatearPeriodo,
	sumarCantidades,
} from "../../../src/features/valorizaciones/domain/valorizacion";

// Caso real de la hoja VALORIZACION del xlsm: excavadora CAT 340, 150 h a USD 47.00,
// anterior 114.40 h y actual 53.23 h (agosto 2026).
const EXCAVADORA = {
	cantidadContractual: "150",
	precioUnitario: 4700,
	cantidadAnterior: "114.4",
	cantidadActual: "53.23",
};
const SIN_RECARGOS = { gastosGeneralesPct: 0, utilidadPct: 0, igvPct: 18, fondoGarantiaPct: 0 };

describe("calcularValorizacion", () => {
	it("reproduce los importes de la hoja VALORIZACION", () => {
		const calculo = calcularValorizacion([EXCAVADORA], SIN_RECARGOS);

		expect(calculo.items[0]).toEqual({
			parcial: 705000,
			cantidadAcumulada: "167.63",
			importeAnterior: 537680,
			importeActual: 250181,
			importeAcumulado: 787861,
			exceso: "17.63",
		});
		expect(calculo.actual).toEqual({
			subtotal1: 250181,
			gastosGenerales: 0,
			utilidad: 0,
			subtotal2: 250181,
			igv: 45033,
			total: 295214,
		});
		expect(calculo.contractual.total).toBe(831900);
	});

	it("corrige el saldo contractual del xlsm y calcula el avance", () => {
		const calculo = calcularValorizacion([EXCAVADORA], SIN_RECARGOS);

		// El xlsm mostraba 2,501.81 (lo del periodo); el saldo real es contrato - acumulado.
		expect(calculo.saldoContractual).toBe(-82861);
		expect(calculo.avancePct).toBe(111.75);
		expect(calculo.excede).toBe(true);
	});

	it("aplica gastos generales y utilidad antes del IGV, y retiene el fondo de garantía", () => {
		const calculo = calcularValorizacion(
			[{ ...EXCAVADORA, cantidadAnterior: "0", cantidadActual: "100" }],
			{ gastosGeneralesPct: 10, utilidadPct: 5, igvPct: 18, fondoGarantiaPct: 5 },
		);

		expect(calculo.actual).toEqual({
			subtotal1: 470000,
			gastosGenerales: 47000,
			utilidad: 23500,
			subtotal2: 540500,
			igv: 97290,
			total: 637790,
		});
		expect(calculo.fondoGarantia).toBe(27025);
		expect(calculo.netoPagable).toBe(637790 - 27025);
		expect(calculo.excede).toBe(false);
	});

	it("suma varios equipos y toma como 0 una cantidad que aún se está escribiendo", () => {
		const calculo = calcularValorizacion(
			[
				{ ...EXCAVADORA, cantidadAnterior: "0", cantidadActual: "10" },
				{
					cantidadContractual: "20",
					precioUnitario: 85000,
					cantidadAnterior: "0",
					cantidadActual: "2.",
				},
			],
			SIN_RECARGOS,
		);

		expect(calculo.items[1].importeActual).toBe(0);
		expect(calculo.actual.subtotal1).toBe(47000);
		expect(calculo.contractual.subtotal1).toBe(705000 + 1700000);
	});

	it("sin monto contractual el avance es 0", () => {
		expect(calcularValorizacion([], SIN_RECARGOS)).toMatchObject({
			avancePct: 0,
			saldoContractual: 0,
			excede: false,
		});
	});
});

describe("sumarCantidades y formatearPeriodo", () => {
	it("suma horas sin errores de punto flotante", () => {
		expect(sumarCantidades(["0.1", "0.2", "114.1"])).toBe("114.4");
	});

	it("muestra el periodo con el nombre del mes", () => {
		expect(formatearPeriodo("2026-08")).toBe("Agosto 2026");
	});
});
