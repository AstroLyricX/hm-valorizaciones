import { z } from "zod";

import { BaseSchema } from "@/data/base";

// Equipos según VALORIZACIONES.txt (hoja EQUIPOS del xlsm).
export const CATEGORIAS_EQUIPO = ["PESADO", "LIVIANO"] as const;
// PROPIO: maquinaria de H&M. PROVEEDOR: un proveedor se la alquila a H&M.
export const PROPIEDADES_EQUIPO = ["PROPIO", "PROVEEDOR"] as const;

// Equipo propio: la situación de la maquinaria de H&M en obra (lista del xlsm).
export const ESTADOS_EQUIPO_PROPIO = ["SB", "FM", "FO", "OP", "P", "D"] as const;
// Equipo de proveedor: el ciclo del alquiler, según el control documentario (checklist inicial
// al recibirlo y checklist final al devolverlo al dueño).
export const ESTADOS_EQUIPO_PROVEEDOR = ["PR", "EO", "FM", "DV"] as const;
// Todos los estados, sin repetir la falla mecánica que comparten.
export const ESTADOS_EQUIPO = ["SB", "FM", "FO", "OP", "P", "D", "PR", "EO", "DV"] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];
export type CategoriaEquipo = (typeof CATEGORIAS_EQUIPO)[number];
export type PropiedadEquipo = (typeof PROPIEDADES_EQUIPO)[number];

export const ESTADOS_POR_PROPIEDAD: Record<PropiedadEquipo, readonly EstadoEquipo[]> = {
	PROPIO: ESTADOS_EQUIPO_PROPIO,
	PROVEEDOR: ESTADOS_EQUIPO_PROVEEDOR,
};
// Estado con el que se registra un equipo nuevo.
export const ESTADO_INICIAL: Record<PropiedadEquipo, EstadoEquipo> = {
	PROPIO: "P",
	PROVEEDOR: "PR",
};

// Lo que se muestra como dueño de un equipo propio.
export const DUENO_PROPIO = "H&M (propio)";

export const ETIQUETA_ESTADO_EQUIPO: Record<EstadoEquipo, string> = {
	SB: "Stand by",
	FM: "Falla mecánica",
	FO: "Fuera de obra",
	OP: "Falta de operador",
	P: "Proyectado",
	D: "Desmovilizado",
	PR: "Por recibir",
	EO: "En obra",
	DV: "Devuelto al dueño",
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

const EquipoCamposSchema = z.object({
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
	propiedad: z.enum(PROPIEDADES_EQUIPO, {
		error: "Indica si el equipo es propio o de un proveedor.",
	}),
	// El proveedor dueño del equipo; vacío si es propio de H&M.
	duenoId: z.string(),
	observaciones: z.string().trim().max(500, "Máximo 500 caracteres."),
});

// Un equipo de proveedor necesita su dueño; uno propio no lleva proveedor.
function conDueno<T extends { propiedad: PropiedadEquipo; duenoId: string }>(equipo: T): T {
	return equipo.propiedad === "PROPIO" ? { ...equipo, duenoId: "" } : equipo;
}

export const EquipoDatosSchema = EquipoCamposSchema.refine(
	(equipo) => equipo.propiedad === "PROPIO" || equipo.duenoId !== "",
	{ message: "Selecciona el proveedor dueño del equipo.", path: ["duenoId"] },
)
	// Cada tipo de equipo tiene su propia lista de estados.
	.refine((equipo) => ESTADOS_POR_PROPIEDAD[equipo.propiedad].includes(equipo.estado), {
		message: "Selecciona el estado.",
		path: ["estado"],
	})
	.transform(conDueno);

// Estado equivalente de un equipo de proveedor registrado con la lista de equipos propios.
export function estadoDeProveedor(estado: string): EstadoEquipo {
	switch (estado) {
		case "P":
			return "PR";
		case "SB":
		case "OP":
			return "EO";
		case "FO":
		case "D":
			return "DV";
		default:
			return (ESTADOS_EQUIPO_PROVEEDOR as readonly string[]).includes(estado)
				? (estado as EstadoEquipo)
				: "EO";
	}
}

export const EquipoSchema = BaseSchema.extend({
	...EquipoCamposSchema.shape,
	// Automático: lo asigna el servicio con el código del dueño (ver activoFijo.ts).
	activoFijo: z.string().min(1),
	// Los equipos anteriores a esta opción eran todos de proveedores.
	propiedad: z.enum(PROPIEDADES_EQUIPO).default("PROVEEDOR"),
});

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
