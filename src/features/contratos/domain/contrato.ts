import Big from "big.js";
import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { siguienteCodigo } from "@/shared/domain/codigo";

// Contrato según VALORIZACIONES.txt: cliente, proyecto, vigencia y, por cada equipo,
// horas mínimas × costo por hora. El monto contractual es la suma de esos parciales.
export const MONEDAS = ["USD", "PEN"] as const;
// EMITIDO: H&M alquila equipos a un cliente y le emite sus valorizaciones (cobra).
// RECIBIDO: un proveedor le alquila equipos a H&M y H&M recibe sus valorizaciones (paga).
export const TIPOS_CONTRATO = ["EMITIDO", "RECIBIDO"] as const;
export const ESTADOS_CONTRATO = ["ACTIVO", "VENCIDO"] as const;

export type Moneda = (typeof MONEDAS)[number];
export type EstadoContrato = (typeof ESTADOS_CONTRATO)[number];
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const ETIQUETA_TIPO_CONTRATO: Record<TipoContrato, string> = {
	EMITIDO: "Emitido",
	RECIBIDO: "Recibido",
};

// Con quién es el contrato según su tipo.
export const CONTRAPARTE: Record<
	TipoContrato,
	{ tipo: "CLIENTE" | "PROVEEDOR"; nombre: string; titulo: string }
> = {
	EMITIDO: { tipo: "CLIENTE", nombre: "cliente", titulo: "Cliente" },
	RECIBIDO: { tipo: "PROVEEDOR", nombre: "proveedor", titulo: "Proveedor" },
};

export const ETIQUETA_MONEDA: Record<Moneda, string> = {
	USD: "Dólares (USD)",
	PEN: "Soles (PEN)",
};

export const ETIQUETA_ESTADO_CONTRATO: Record<EstadoContrato, string> = {
	ACTIVO: "Activo",
	VENCIDO: "Vencido",
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORAS = /^\d{1,7}(\.\d{1,2})?$/;

// Zod 4 ejecuta todas las validaciones aunque falle el formato: se comprueba el formato
// antes de usar big.js para no lanzar con textos inválidos.
const horasPositivas = z
	.string()
	.regex(HORAS, "Ingresa las horas, por ejemplo 150.")
	.refine(
		(valor) => !HORAS.test(valor) || new Big(valor).gt(0),
		"Las horas deben ser mayores a 0.",
	);

export const ContratoEquipoDatosSchema = z.object({
	// Presente cuando el registro ya existía (edición).
	id: z.string().optional(),
	equipoId: z.string().min(1, "Selecciona el equipo."),
	// Horas mínimas contratadas, como texto decimal para no perder precisión.
	horasMinimas: horasPositivas,
	// Costo por hora en centavos.
	costoHora: z
		.int({ error: "Ingresa el costo por hora, por ejemplo 47.00." })
		.positive("El costo por hora debe ser mayor a 0."),
});

export const ContratoCabeceraSchema = z.object({
	tipo: z.enum(TIPOS_CONTRATO, { error: "Selecciona el tipo de contrato." }),
	// El cliente (contrato emitido) o el proveedor (contrato recibido).
	terceroId: z.string().min(1, "Selecciona el cliente o proveedor."),
	proyecto: z
		.string()
		.trim()
		.min(3, "Ingresa el proyecto.")
		.max(150, "Máximo 150 caracteres.")
		.transform((valor) => valor.toUpperCase()),
	ubicacion: z
		.string()
		.trim()
		.min(3, "Ingresa la ubicación.")
		.max(150, "Máximo 150 caracteres.")
		.transform((valor) => valor.toUpperCase()),
	documentoContractual: z.string().trim().max(60, "Máximo 60 caracteres."),
	fechaInicio: z.string().regex(FECHA, "Selecciona la fecha de inicio."),
	fechaFin: z.string().regex(FECHA, "Selecciona la fecha de fin."),
	moneda: z.enum(MONEDAS, { error: "Selecciona la moneda." }),
	// Opcional: 0 si no aplica. Se descuenta al facturar y pagar.
	fondoGarantiaPct: z
		.number({ error: "Ingresa un porcentaje, por ejemplo 5." })
		.min(0, "No puede ser negativo.")
		.max(100, "No puede superar 100 %.")
		.multipleOf(0.01, "Máximo 2 decimales."),
	observaciones: z.string().trim().max(500, "Máximo 500 caracteres."),
});

export const ContratoDatosSchema = ContratoCabeceraSchema.extend({
	equipos: z.array(ContratoEquipoDatosSchema).min(1, "Agrega al menos un equipo."),
})
	.refine((datos) => !FECHA.test(datos.fechaFin) || datos.fechaFin >= datos.fechaInicio, {
		message: "La fecha de fin debe ser igual o posterior a la de inicio.",
		path: ["fechaFin"],
	})
	.refine(
		(datos) =>
			new Set(datos.equipos.map((equipo) => equipo.equipoId)).size === datos.equipos.length,
		{
			message: "Cada equipo puede aparecer una sola vez en el contrato.",
			path: ["equipos"],
		},
	);

export const ContratoSchema = BaseSchema.extend({
	...ContratoCabeceraSchema.shape,
	// Los contratos anteriores a los proveedores eran todos con clientes.
	tipo: z.enum(TIPOS_CONTRATO).default("EMITIDO"),
	codigo: z.string().regex(/^CTR-\d{3,}$/),
	// Suma de horas mínimas × costo por hora de todos los equipos, en centavos.
	montoContractual: z.int().nonnegative(),
});

export const ContratoEquipoSchema = BaseSchema.extend({
	...ContratoEquipoDatosSchema.omit({ id: true }).shape,
	contratoId: z.string().min(1),
	orden: z.int().positive(),
});

export type ContratoEquipoDatos = z.infer<typeof ContratoEquipoDatosSchema>;
export type ContratoDatos = z.infer<typeof ContratoDatosSchema>;
export type Contrato = z.infer<typeof ContratoSchema>;
export type ContratoEquipo = z.infer<typeof ContratoEquipoSchema>;

export function siguienteCodigoContrato(codigos: readonly string[]): string {
	return siguienteCodigo("CTR-", codigos);
}

// Parcial = horas mínimas × costo por hora, redondeado al centavo.
export function parcialEquipo(
	equipo: Pick<ContratoEquipoDatos, "horasMinimas" | "costoHora">,
): number {
	return new Big(equipo.horasMinimas).times(equipo.costoHora).round(0, Big.roundHalfUp).toNumber();
}

export function montoContractual(
	equipos: readonly Pick<ContratoEquipoDatos, "horasMinimas" | "costoHora">[],
): number {
	return equipos.reduce((total, equipo) => total + parcialEquipo(equipo), 0);
}

// El estado no se elige: el contrato vence cuando pasa su fecha de fin.
export function estadoContrato(contrato: Pick<Contrato, "fechaFin">, hoy: string): EstadoContrato {
	return contrato.fechaFin < hoy ? "VENCIDO" : "ACTIVO";
}

export function hoyIso(): string {
	const ahora = new Date();
	const mes = String(ahora.getMonth() + 1).padStart(2, "0");
	const dia = String(ahora.getDate()).padStart(2, "0");

	return `${ahora.getFullYear()}-${mes}-${dia}`;
}
