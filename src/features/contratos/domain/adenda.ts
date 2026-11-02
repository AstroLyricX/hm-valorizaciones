import { z } from "zod";

import { BaseSchema } from "@/data/base";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Motivos frecuentes de una adenda; con "Otro" se escribe el motivo completo.
export const MOTIVOS_ADENDA = [
	"AMPLIACION_PLAZO",
	"CAMBIO_EQUIPOS",
	"CAMBIO_PRECIOS",
	"OTRO",
] as const;

export type MotivoAdenda = (typeof MOTIVOS_ADENDA)[number];

export const ETIQUETA_MOTIVO_ADENDA: Record<MotivoAdenda, string> = {
	AMPLIACION_PLAZO: "Ampliación de plazo",
	CAMBIO_EQUIPOS: "Cambio de equipos",
	CAMBIO_PRECIOS: "Cambio de horas o precios",
	OTRO: "Otro motivo",
};

export const DESCRIPCION_MOTIVO_ADENDA: Record<MotivoAdenda, string> = {
	AMPLIACION_PLAZO: "Se extiende la vigencia del contrato.",
	CAMBIO_EQUIPOS: "Se agregan, quitan o reemplazan equipos.",
	CAMBIO_PRECIOS: "Cambian las horas mínimas o el costo por hora.",
	OTRO: "Escribe el motivo.",
};

// Lo que se llena en el formulario. Con "Otro" el detalle es obligatorio.
export const AdendaDatosSchema = z
	.object({
		fecha: z.string().regex(FECHA, "Selecciona la fecha de la adenda."),
		motivo: z.enum(MOTIVOS_ADENDA, { error: "Elige el motivo de la adenda." }),
		detalle: z.string().trim().max(250, "Máximo 250 caracteres."),
	})
	.refine((datos) => datos.motivo !== "OTRO" || datos.detalle.length >= 5, {
		message: "Escribe el motivo de la adenda.",
		path: ["detalle"],
	});

export const AdendaSchema = BaseSchema.extend({
	contratoId: z.string().min(1),
	// Correlativo dentro del contrato: Adenda N.° 1, 2, 3…
	numero: z.int().positive(),
	fecha: z.string().regex(FECHA),
	// Texto que se muestra: la etiqueta del motivo o lo escrito en "Otro".
	motivo: z.string().trim().min(5).max(250),
});

export type AdendaDatos = z.infer<typeof AdendaDatosSchema>;
export type Adenda = z.infer<typeof AdendaSchema>;

export function textoMotivoAdenda(datos: Pick<AdendaDatos, "motivo" | "detalle">): string {
	return datos.motivo === "OTRO" ? datos.detalle.trim() : ETIQUETA_MOTIVO_ADENDA[datos.motivo];
}

export function siguienteNumeroAdenda(adendas: readonly Pick<Adenda, "numero">[]): number {
	return Math.max(0, ...adendas.map((adenda) => adenda.numero)) + 1;
}
