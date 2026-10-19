import type { Tercero } from "@/features/clientes/domain/tercero";
import {
	type Contrato,
	type ContratoEquipo,
	estadoContrato,
} from "@/features/contratos/domain/contrato";
import type { Valorizacion } from "@/features/valorizaciones/domain/valorizacion";
import type { Moneda } from "@/lib/dinero";

// Desde qué avance (lo valorizado sobre el monto contractual) un contrato pide atención.
export const UMBRAL_AVANCE = 90;

export interface ContratoEnAlerta {
	contrato: Contrato;
	cliente: string;
	valorizado: number;
	avancePct: number;
	// "excedido": se valorizó más que el monto contractual; "por-agotarse": 90 % o más.
	nivel: "excedido" | "por-agotarse";
}

export interface ResumenInicio {
	// Total de las valorizaciones emitidas este mes, por moneda: lo que H&M cobra (contratos
	// emitidos) y lo que paga (contratos recibidos).
	porCobrarMes: Partial<Record<Moneda, number>>;
	porPagarMes: Partial<Record<Moneda, number>>;
	contratosActivos: number;
	equiposEnObra: number;
	clientesActivos: number;
	alertas: ContratoEnAlerta[];
	borradores: Valorizacion[];
	ultimasEmitidas: Valorizacion[];
}

interface Datos {
	terceros: readonly Tercero[];
	contratos: readonly Contrato[];
	contratoEquipos: readonly ContratoEquipo[];
	valorizaciones: readonly Valorizacion[];
	// Fecha de hoy "YYYY-MM-DD".
	hoy: string;
}

function avance(valorizado: number, monto: number): number {
	return monto === 0 ? 0 : Math.round((valorizado / monto) * 10000) / 100;
}

// Contratos con lo valorizado (emitidas) en 90 % o más de su monto contractual.
export function contratosEnAlerta(
	contratos: readonly Contrato[],
	valorizaciones: readonly Valorizacion[],
	terceros: readonly Tercero[],
): ContratoEnAlerta[] {
	const nombres = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]));
	const emitidas = valorizaciones.filter((valorizacion) => valorizacion.estado === "EMITIDA");
	const valorizadoPorContrato = new Map<string, number>();
	for (const valorizacion of emitidas) {
		valorizadoPorContrato.set(
			valorizacion.contratoId,
			(valorizadoPorContrato.get(valorizacion.contratoId) ?? 0) +
				(valorizacion.totales?.subtotal1 ?? 0),
		);
	}

	return contratos
		.map((contrato): ContratoEnAlerta => {
			const valorizado = valorizadoPorContrato.get(contrato.id) ?? 0;
			const avancePct = avance(valorizado, contrato.montoContractual);

			return {
				contrato,
				cliente: nombres.get(contrato.terceroId) ?? "—",
				valorizado,
				avancePct,
				nivel: avancePct > 100 ? "excedido" : "por-agotarse",
			};
		})
		.filter((alerta) => alerta.avancePct >= UMBRAL_AVANCE)
		.sort((a, b) => b.avancePct - a.avancePct);
}

// Indicadores de la pantalla de Inicio (como la hoja INICIO del xlsm) con datos reales.
export function resumenInicio({
	terceros,
	contratos,
	contratoEquipos,
	valorizaciones,
	hoy,
}: Datos): ResumenInicio {
	const mes = hoy.slice(0, 7);
	const activos = contratos.filter((contrato) => estadoContrato(contrato, hoy) === "ACTIVO");
	const idsActivos = new Set(activos.map((contrato) => contrato.id));
	const emitidas = valorizaciones.filter((valorizacion) => valorizacion.estado === "EMITIDA");

	const tipoDe = new Map(contratos.map((contrato) => [contrato.id, contrato.tipo]));
	const porCobrarMes: Partial<Record<Moneda, number>> = {};
	const porPagarMes: Partial<Record<Moneda, number>> = {};
	for (const valorizacion of emitidas) {
		if (valorizacion.fechaEmision?.startsWith(mes) === true && valorizacion.totales) {
			const destino =
				tipoDe.get(valorizacion.contratoId) === "RECIBIDO" ? porPagarMes : porCobrarMes;
			destino[valorizacion.moneda] =
				(destino[valorizacion.moneda] ?? 0) + valorizacion.totales.total;
		}
	}

	const alertas = contratosEnAlerta(contratos, valorizaciones, terceros);

	const porFechaDesc = (a: Valorizacion, b: Valorizacion) =>
		(b.fechaEmision ?? "").localeCompare(a.fechaEmision ?? "") ||
		(b.numero ?? "").localeCompare(a.numero ?? "");

	return {
		porCobrarMes,
		porPagarMes,
		contratosActivos: activos.length,
		equiposEnObra: new Set(
			contratoEquipos
				.filter((contratoEquipo) => idsActivos.has(contratoEquipo.contratoId))
				.map((contratoEquipo) => contratoEquipo.equipoId),
		).size,
		clientesActivos: terceros.filter(
			(tercero) => tercero.tipo === "CLIENTE" && tercero.estado === "ACTIVO",
		).length,
		alertas,
		borradores: valorizaciones
			.filter((valorizacion) => valorizacion.estado === "BORRADOR")
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
		ultimasEmitidas: valorizaciones
			.filter((valorizacion) => valorizacion.estado !== "BORRADOR")
			.sort(porFechaDesc)
			.slice(0, 5),
	};
}
