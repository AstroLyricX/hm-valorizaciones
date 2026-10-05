import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { siguienteCodigo as siguienteCodigoConPrefijo } from "@/shared/domain/codigo";

// Maquinaria (hoja EQUIPOS del xlsm).
export const ESTADOS_EQUIPO = ["OPERATIVO", "EN_MANTENIMIENTO", "INOPERATIVO", "BAJA"] as const;
export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

export const ETIQUETA_ESTADO_EQUIPO: Record<EstadoEquipo, string> = {
	OPERATIVO: "Operativo",
	EN_MANTENIMIENTO: "En mantenimiento",
	INOPERATIVO: "Inoperativo",
	BAJA: "De baja",
};

// Sugerencias para el campo tipo; se puede escribir cualquier otro.
export const TIPOS_SUGERIDOS = [
	"EXCAVADORA",
	"RETROEXCAVADORA",
	"CARGADOR FRONTAL",
	"TRACTOR ORUGA",
	"MOTONIVELADORA",
	"RODILLO COMPACTADOR",
	"VOLQUETE",
	"CAMIÓN CISTERNA",
	"MINICARGADOR",
	"GRÚA",
] as const;

const ANIO_MINIMO = 1950;

const textoOpcional = (max: number) =>
	z.string().trim().max(max, `Máximo ${max} caracteres.`).or(z.literal(""));

const mayusculas = (min: number, max: number, mensaje: string) =>
	z
		.string()
		.trim()
		.min(min, mensaje)
		.max(max, `Máximo ${max} caracteres.`)
		.transform((valor) => valor.toUpperCase());

export const EquipoDatosSchema = z.object({
	tipo: mayusculas(2, 60, "Ingresa el tipo de equipo, por ejemplo Excavadora."),
	marca: mayusculas(1, 60, "Ingresa la marca."),
	modelo: mayusculas(1, 60, "Ingresa el modelo."),
	serie: textoOpcional(60).transform((valor) => valor.toUpperCase()),
	placa: textoOpcional(15).transform((valor) => valor.toUpperCase()),
	anio: z
		.string()
		.trim()
		.regex(/^\d{4}$/, "Ingresa el año con 4 dígitos.")
		.refine(
			(valor) => Number(valor) >= ANIO_MINIMO && Number(valor) <= new Date().getFullYear() + 1,
			`Ingresa un año entre ${ANIO_MINIMO} y ${new Date().getFullYear() + 1}.`,
		)
		.or(z.literal("")),
	propietario: textoOpcional(150),
	// Horas acumuladas como texto decimal ("1250.5") para no perder precisión.
	horometro: z
		.string()
		.trim()
		.regex(/^\d{1,7}([.,]\d{1,2})?$/, "Ingresa las horas, por ejemplo 1250.5.")
		.transform((valor) => valor.replace(",", "."))
		.or(z.literal("")),
	estado: z.enum(ESTADOS_EQUIPO, { error: "Elige el estado del equipo." }),
	ubicacion: textoOpcional(150),
	observaciones: textoOpcional(500),
});

export const EquipoSchema = BaseSchema.extend({
	...EquipoDatosSchema.shape,
	codigo: z.string().regex(/^EQ-\d{3,}$/),
});

export type EquipoDatos = z.infer<typeof EquipoDatosSchema>;
export type EquipoDatosInput = z.input<typeof EquipoDatosSchema>;
export type Equipo = z.infer<typeof EquipoSchema>;

export function siguienteCodigoEquipo(codigos: readonly string[]): string {
	return siguienteCodigoConPrefijo("EQ-", codigos);
}

// Nombre corto para listas y para los ítems de contrato: "EXCAVADORA CAT 340".
export function nombreEquipo(equipo: Pick<Equipo, "tipo" | "marca" | "modelo">): string {
	return [equipo.tipo, equipo.marca, equipo.modelo].filter(Boolean).join(" ");
}
