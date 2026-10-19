import type { Tercero } from "@/features/clientes/domain/tercero";
import {
	type Contrato,
	diasEntre,
	diasParaVencer,
	estadoContrato,
	textoVencimiento,
	vigenciaContrato,
} from "@/features/contratos/domain/contrato";
import { contratosEnAlerta } from "@/features/inicio/domain/resumen";
import { formatearPeriodo, type Valorizacion } from "@/features/valorizaciones/domain/valorizacion";
import { formatearFechaNumerica } from "@/lib/fechas";

// Días que se muestra una valorización recién emitida.
export const DIAS_AVISO_EMITIDA = 7;

export const TIPOS_AVISO = [
	"CONTRATO_POR_VENCER",
	"HORAS_EXCEDIDAS",
	"AVANCE_90",
	"BORRADOR_PENDIENTE",
	"VALORIZACION_EMITIDA",
] as const;

export type TipoAviso = (typeof TIPOS_AVISO)[number];

export interface Aviso {
	// Estable mientras dure la situación: sirve para recordar si ya se leyó o se notificó.
	id: string;
	tipo: TipoAviso;
	titulo: string;
	detalle: string;
	// Pantalla que se abre al tocar el aviso.
	ruta: string;
	// "alerta" pide atención; "info" solo informa.
	nivel: "alerta" | "info";
	// Para ordenar: lo más reciente o urgente primero.
	fecha: string;
}

interface Datos {
	contratos: readonly Contrato[];
	valorizaciones: readonly Valorizacion[];
	terceros: readonly Tercero[];
	// "YYYY-MM-DD".
	hoy: string;
}

// Avisos que se calculan con los datos del dispositivo: no necesitan servidor ni conexión.
// Desaparecen solos cuando la situación se resuelve (se amplía el contrato, se emite el borrador…).
export function calcularAvisos({ contratos, valorizaciones, terceros, hoy }: Datos): Aviso[] {
	const porId = new Map(contratos.map((contrato) => [contrato.id, contrato]));
	const avisos: Aviso[] = [];

	for (const contrato of contratos) {
		if (vigenciaContrato(contrato, hoy) === "POR_VENCER") {
			avisos.push({
				id: `vence:${contrato.id}:${contrato.fechaFin}`,
				tipo: "CONTRATO_POR_VENCER",
				titulo: `${textoVencimiento(diasParaVencer(contrato, hoy))}: ${contrato.codigo}`,
				detalle: `${contrato.proyecto} · ${formatearFechaNumerica(contrato.fechaFin)}`,
				ruta: `/contratos/${contrato.id}`,
				nivel: "alerta",
				fecha: contrato.fechaFin,
			});
		}
	}

	// Solo los contratos activos: uno vencido ya no se puede corregir.
	const activos = contratos.filter((contrato) => estadoContrato(contrato, hoy) === "ACTIVO");
	for (const alerta of contratosEnAlerta(activos, valorizaciones, terceros)) {
		const excedido = alerta.nivel === "excedido";
		avisos.push({
			id: `avance:${alerta.contrato.id}:${alerta.nivel}`,
			tipo: excedido ? "HORAS_EXCEDIDAS" : "AVANCE_90",
			titulo: `${alerta.contrato.codigo} ${excedido ? "supera lo contratado" : "está por agotarse"}`,
			detalle: `${alerta.avancePct.toLocaleString("es-PE")} % valorizado · ${alerta.contrato.proyecto}`,
			ruta: `/contratos/${alerta.contrato.id}`,
			nivel: "alerta",
			fecha: hoy,
		});
	}

	for (const valorizacion of valorizaciones) {
		const contrato = porId.get(valorizacion.contratoId);
		if (!contrato) {
			continue;
		}
		if (valorizacion.estado === "BORRADOR") {
			avisos.push({
				id: `borrador:${valorizacion.id}`,
				tipo: "BORRADOR_PENDIENTE",
				titulo: `Borrador sin emitir: ${formatearPeriodo(valorizacion.periodo)}`,
				detalle: `${contrato.codigo} · ${contrato.proyecto}`,
				ruta: `/valorizaciones/${valorizacion.id}`,
				nivel: "info",
				fecha: valorizacion.updatedAt.slice(0, 10),
			});
		} else if (
			valorizacion.estado === "EMITIDA" &&
			valorizacion.fechaEmision !== null &&
			diasEntre(valorizacion.fechaEmision, hoy) <= DIAS_AVISO_EMITIDA
		) {
			avisos.push({
				id: `emitida:${valorizacion.id}`,
				tipo: "VALORIZACION_EMITIDA",
				titulo: `Emitida ${valorizacion.numero ?? ""}`.trim(),
				detalle: `${contrato.codigo} · ${formatearPeriodo(valorizacion.periodo)}`,
				ruta: `/valorizaciones/${valorizacion.id}`,
				nivel: "info",
				fecha: valorizacion.fechaEmision,
			});
		}
	}

	const orden = (aviso: Aviso) => (aviso.nivel === "alerta" ? 0 : 1);

	return avisos.sort(
		(a, b) =>
			orden(a) - orden(b) ||
			TIPOS_AVISO.indexOf(a.tipo) - TIPOS_AVISO.indexOf(b.tipo) ||
			(a.tipo === "CONTRATO_POR_VENCER"
				? a.fecha.localeCompare(b.fecha)
				: b.fecha.localeCompare(a.fecha)),
	);
}

// Texto de la notificación del sistema con los avisos nuevos.
export function resumenNotificacion(nuevos: readonly Aviso[]): { titulo: string; cuerpo: string } {
	if (nuevos.length === 1) {
		return { titulo: nuevos[0].titulo, cuerpo: nuevos[0].detalle };
	}

	return {
		titulo: `${nuevos.length} avisos nuevos`,
		cuerpo: nuevos
			.slice(0, 3)
			.map((aviso) => aviso.titulo)
			.join("\n"),
	};
}
