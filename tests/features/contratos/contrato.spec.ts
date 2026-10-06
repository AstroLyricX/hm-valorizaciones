import {
	ContratoDatosSchema,
	estadoContrato,
	montoContractual,
	parcialEquipo,
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
		expect(repetido.error?.issues[0]?.message).toBe(
			"Cada equipo puede aparecer una sola vez en el contrato.",
		);
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
