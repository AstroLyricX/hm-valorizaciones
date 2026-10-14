import { db } from "../../../src/data/db";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import {
	contratoRepository,
	contratoService,
} from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { resumenInicio } from "../../../src/features/inicio/domain/resumen";
import { valorizacionService } from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { CLIENTE, excavadora, HUISE, volquete } from "../../support/fixtures";
import { contratoDatos, equipoDelContrato } from "../contratos/fixtures";

const HOY = "2026-09-20";

async function valorizar(contratoId: string, periodo: string, horas: string, fecha: string) {
	const borrador = await valorizacionService.crearBorrador({ contratoId, periodo }, "ana@hm.pe");
	const [fila] = (await valorizacionService.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		borrador.id,
		fila.contratoEquipoId,
		horas,
		"ana@hm.pe",
	);

	return valorizacionService.emitir(borrador.id, "ana@hm.pe", fecha);
}

async function resumen() {
	return resumenInicio({
		terceros: await clienteService.listar(),
		contratos: await contratoRepository.listar(),
		contratoEquipos: await contratoRepository.todosLosEquipos(),
		valorizaciones: await valorizacionService.listar(),
		hoy: HOY,
	});
}

let osur: string;
let antiguo: string;

beforeEach(async () => {
	await db.delete();
	await db.open();
	const andina = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const huise = (await clienteService.crear(HUISE, "ana@hm.pe")).id;
	await clienteService.cambiarEstado(huise, "INACTIVO", "ana@hm.pe");
	const excavadoraId = (await equipoService.crear(excavadora(andina), "ana@hm.pe")).id;
	const volqueteId = (await equipoService.crear(volquete(andina), "ana@hm.pe")).id;
	// OSUR: 150 h × USD 47.00 = USD 7,050.00, vigente.
	osur = (await contratoService.crear(contratoDatos(andina, excavadoraId), "ana@hm.pe")).contrato
		.id;
	// Contrato vencido con el volquete: no cuenta como activo ni su equipo como en obra.
	antiguo = (
		await contratoService.crear(
			contratoDatos(andina, volqueteId, {
				proyecto: "Antiguo",
				fechaInicio: "2025-01-01",
				fechaFin: "2025-12-31",
				equipos: [equipoDelContrato(volqueteId, { horasMinimas: "100", costoHora: 10000 })],
			}),
			"ana@hm.pe",
		)
	).contrato.id;
});

describe("resumenInicio", () => {
	it("cuenta clientes activos, contratos vigentes y equipos en obra", async () => {
		expect(await resumen()).toMatchObject({
			clientesActivos: 1,
			contratosActivos: 1,
			equiposEnObra: 1,
			valorizadoMes: {},
			alertas: [],
		});
	});

	it("suma el total facturado del mes y avisa los contratos excedidos o al 90 %", async () => {
		// Caso del xlsm: 114.40 h en agosto y 53.23 h emitida en septiembre → 111.75 %.
		await valorizar(osur, "2026-07", "114.4", "2026-08-03");
		await valorizar(osur, "2026-08", "53.23", "2026-09-17");
		// 92 h de 100 en el contrato antiguo → 92 %, por agotarse.
		await valorizar(antiguo, "2025-12", "92", "2026-09-05");

		const datos = await resumen();

		// Solo las emitidas en septiembre: 2,952.14 + 92 h × 100 × 1.18 = 10,856.00.
		expect(datos.valorizadoMes).toEqual({ USD: 295214 + 1085600 });
		expect(
			datos.alertas.map((alerta) => [alerta.contrato.codigo, alerta.avancePct, alerta.nivel]),
		).toEqual([
			["CTR-001", 111.75, "excedido"],
			["CTR-002", 92, "por-agotarse"],
		]);
		expect(datos.ultimasEmitidas.map((valorizacion) => valorizacion.numero)).toEqual([
			"0002-2026",
			"0003-2026",
			"0001-2026",
		]);
	});

	it("lista los borradores pendientes y no cuenta las anuladas como valorizado", async () => {
		const emitida = await valorizar(osur, "2026-07", "100", "2026-09-10");
		await valorizacionService.anular(emitida.id, "Horas mal cargadas", "ana@hm.pe", "ADMIN");
		await valorizacionService.crearBorrador({ contratoId: osur, periodo: "2026-09" }, "ana@hm.pe");

		const datos = await resumen();

		expect(datos.valorizadoMes).toEqual({});
		expect(datos.alertas).toEqual([]);
		expect(datos.borradores.map((borrador) => borrador.periodo)).toEqual(["2026-09"]);
		expect(datos.ultimasEmitidas.map((valorizacion) => valorizacion.estado)).toEqual(["ANULADA"]);
	});
});
