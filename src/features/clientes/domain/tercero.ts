import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { siguienteCodigo as siguienteCodigoConPrefijo } from "@/shared/domain/codigo";
import { rucValido } from "@/shared/domain/ruc";

// Clientes según VALORIZACIONES.txt (hoja CLIENTES del xlsm). También son los dueños de los equipos.
export const ESTADOS_TERCERO = ["ACTIVO", "INACTIVO"] as const;
export const ESTADOS_CIVILES = ["SOLTERO", "CASADO", "CONVIVIENTE", "DIVORCIADO", "VIUDO"] as const;
export const BANCOS = [
	"BCP",
	"BBVA",
	"INTERBANK",
	"SCOTIABANK",
	"BANCO DE LA NACIÓN",
	"BANBIF",
	"PICHINCHA",
	"CAJA AREQUIPA",
	"CAJA CUSCO",
	"OTRO",
] as const;

export type EstadoTercero = (typeof ESTADOS_TERCERO)[number];
export type EstadoCivil = (typeof ESTADOS_CIVILES)[number];

export const ETIQUETA_ESTADO: Record<EstadoTercero, string> = {
	ACTIVO: "Activo",
	INACTIVO: "Inactivo",
};

export const ETIQUETA_ESTADO_CIVIL: Record<EstadoCivil, string> = {
	SOLTERO: "Soltero(a)",
	CASADO: "Casado(a)",
	CONVIVIENTE: "Conviviente",
	DIVORCIADO: "Divorciado(a)",
	VIUDO: "Viudo(a)",
};

const mayusculas = (min: number, max: number, mensaje: string) =>
	z
		.string()
		.trim()
		.min(min, mensaje)
		.max(max, `Máximo ${max} caracteres.`)
		.transform((valor) => valor.toUpperCase());

const opcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const TerceroDatosSchema = z.object({
	razonSocial: mayusculas(3, 150, "Ingresa la razón social."),
	ruc: z
		.string()
		.trim()
		.regex(/^\d{11}$/, "El RUC debe tener 11 dígitos.")
		.refine(rucValido, "El RUC no es válido. Revisa los dígitos."),
	direccion: mayusculas(5, 200, "Ingresa la dirección."),
	correo: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.email("Ingresa un correo válido, por ejemplo empresa@correo.com.")),
	estado: z.enum(ESTADOS_TERCERO, { error: "Selecciona el estado." }),
	// Representante legal o contacto.
	representanteNombre: mayusculas(3, 150, "Ingresa el nombre completo del representante."),
	representanteDni: z
		.string()
		.trim()
		.regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
	representanteTelefono: z
		.string()
		.trim()
		.regex(/^[\d\s+-]{6,20}$/, "Ingresa un teléfono válido."),
	representanteDireccion: opcional(200),
	representanteEstadoCivil: z.enum(ESTADOS_CIVILES).or(z.literal("")),
	// Datos bancarios (opcionales).
	banco: z.enum(BANCOS).or(z.literal("")),
	numeroCuenta: z
		.string()
		.trim()
		.regex(/^[\d-]{8,24}$/, "Ingresa solo números y guiones.")
		.or(z.literal("")),
	cci: z
		.string()
		.trim()
		.regex(/^\d{20}$/, "El CCI debe tener 20 dígitos.")
		.or(z.literal("")),
});

export const TerceroSchema = BaseSchema.extend({
	...TerceroDatosSchema.shape,
	codigo: z.string().regex(/^CLI-\d{3,}$/),
});

export type TerceroDatos = z.infer<typeof TerceroDatosSchema>;
export type TerceroDatosInput = z.input<typeof TerceroDatosSchema>;
export type Tercero = z.infer<typeof TerceroSchema>;

// Siguiente código correlativo (CLI-001, CLI-002…), igual que GenerarCodigoCliente del xlsm.
export function siguienteCodigo(codigos: readonly string[]): string {
	return siguienteCodigoConPrefijo("CLI-", codigos);
}

export class RucDuplicadoError extends Error {
	constructor(
		readonly ruc: string,
		readonly codigoExistente: string,
	) {
		super(`El RUC ${ruc} ya está registrado (${codigoExistente}).`);
		this.name = "RucDuplicadoError";
	}
}
