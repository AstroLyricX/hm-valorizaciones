import { z } from "zod";

import { BaseSchema } from "@/data/base";

// Equipos según VALORIZACIONES.txt (hoja EQUIPOS del xlsm).
export const ESTADOS_EQUIPO = ["SB", "FM", "FO", "OP", "P", "D"] as const;
export const CATEGORIAS_EQUIPO = ["PESADO", "LIVIANO"] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];
export type CategoriaEquipo = (typeof CATEGORIAS_EQUIPO)[number];

export const ETIQUETA_ESTADO_EQUIPO: Record<EstadoEquipo, string> = {
	SB: "Stand by",
	FM: "Falla mecánica",
	FO: "Fuera de obra",
	OP: "Falta de operador",
	P: "Proyectado",
	D: "Desmovilizado",
};

export const ETIQUETA_CATEGORIA: Record<CategoriaEquipo, string> = {
	PESADO: "Pesado",
	LIVIANO: "Liviano",
};

const ANIO_MINIMO = 1950;

const mayusculas = (min: number, max: number, mensaje: string) =>
	z
		.string()
		.trim()
		.min(min, mensaje)
		.max(max, `Máximo ${max} caracteres.`)
		.transform((valor) => valor.toUpperCase());

const opcionalMayusculas = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Máximo ${max} caracteres.`)
		.transform((valor) => valor.toUpperCase());

export const EquipoDatosSchema = z.object({
	activoFijo: mayusculas(1, 30, "Ingresa el código de activo fijo."),
	descripcion: mayusculas(3, 120, "Ingresa la descripción del equipo, por ejemplo Excavadora."),
	fabricante: mayusculas(1, 60, "Ingresa el fabricante."),
	modelo: mayusculas(1, 60, "Ingresa el modelo."),
	// Algunos equipos livianos no tienen serie.
	serieEquipo: opcionalMayusculas(60),
	marcaMotor: mayusculas(1, 60, "Ingresa la marca del motor."),
	tipoMotor: opcionalMayusculas(60),
	serieMotor: opcionalMayusculas(60),
	placa: mayusculas(3, 15, "Ingresa la placa."),
	anio: z
		.string()
		.trim()
		.regex(/^\d{4}$/, "Ingresa el año con 4 dígitos.")
		.refine(
			(valor) => Number(valor) >= ANIO_MINIMO && Number(valor) <= new Date().getFullYear() + 1,
			`Ingresa un año entre ${ANIO_MINIMO} y ${new Date().getFullYear() + 1}.`,
		),
	categoria: z.enum(CATEGORIAS_EQUIPO, { error: "Selecciona la categoría." }),
	estado: z.enum(ESTADOS_EQUIPO, { error: "Selecciona el estado." }),
	// Dueño del equipo: un cliente registrado.
	duenoId: z.string().min(1, "Selecciona el dueño del equipo."),
	observaciones: z.string().trim().max(500, "Máximo 500 caracteres."),
});

export const EquipoSchema = BaseSchema.extend(EquipoDatosSchema.shape);

export type EquipoDatos = z.infer<typeof EquipoDatosSchema>;
export type EquipoDatosInput = z.input<typeof EquipoDatosSchema>;
export type Equipo = z.infer<typeof EquipoSchema>;

// Nombre corto para listas y contratos: "EXCAVADORA CAT 340".
export function nombreEquipo(
	equipo: Pick<Equipo, "descripcion" | "fabricante" | "modelo">,
): string {
	return [equipo.descripcion, equipo.fabricante, equipo.modelo].filter(Boolean).join(" ");
}

export class ActivoFijoDuplicadoError extends Error {
	constructor(readonly activoFijo: string) {
		super(`El activo fijo ${activoFijo} ya está registrado.`);
		this.name = "ActivoFijoDuplicadoError";
	}
}

export class PlacaDuplicadaError extends Error {
	constructor(
		readonly placa: string,
		readonly activoFijoExistente: string,
	) {
		super(`La placa ${placa} ya está registrada (${activoFijoExistente}).`);
		this.name = "PlacaDuplicadaError";
	}
}
