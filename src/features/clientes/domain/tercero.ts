import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { PREFIJO_PROPIO } from "@/features/equipos/domain/activoFijo";
import { siguienteCodigo as siguienteCodigoConPrefijo } from "@/shared/domain/codigo";
import { rucValido } from "@/shared/domain/ruc";

// Clientes y proveedores según VALORIZACIONES.txt (hoja CLIENTES del xlsm): tienen los mismos
// datos, pero son listas separadas. El cliente es para quien trabaja H&M (contratos); el
// proveedor alquila sus equipos a H&M (dueño de los equipos).
export const TIPOS_TERCERO = ["CLIENTE", "PROVEEDOR"] as const;
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

export type TipoTercero = (typeof TIPOS_TERCERO)[number];
export type EstadoTercero = (typeof ESTADOS_TERCERO)[number];

const PREFIJO: Record<TipoTercero, string> = { CLIENTE: "CLI-", PROVEEDOR: "PRO-" };
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
	// Solo proveedores: letras del activo fijo de sus equipos (HQA → HQA001). Vacío: se genera.
	prefijoEquipos: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^[A-Z]{2,4}$/, "Usa de 2 a 4 letras, por ejemplo HQA.")
		.refine(
			(prefijo) => prefijo !== PREFIJO_PROPIO,
			`${PREFIJO_PROPIO} es el código de los equipos propios de H&M.`,
		)
		.or(z.literal("")),
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
	// Los registros anteriores a los proveedores eran todos clientes.
	tipo: z.enum(TIPOS_TERCERO).default("CLIENTE"),
	codigo: z.string().regex(/^(CLI|PRO)-\d{3,}$/),
	prefijoEquipos: z.string().default(""),
});

export type TerceroDatos = z.infer<typeof TerceroDatosSchema>;
export type TerceroDatosInput = z.input<typeof TerceroDatosSchema>;
export type Tercero = z.infer<typeof TerceroSchema>;

// Siguiente código correlativo (CLI-001, CLI-002… o PRO-001…), como GenerarCodigoCliente del xlsm.
export function siguienteCodigo(codigos: readonly string[], tipo: TipoTercero = "CLIENTE"): string {
	return siguienteCodigoConPrefijo(PREFIJO[tipo], codigos);
}

// Palabras que no cuentan para las iniciales: formas societarias y conectores.
const SIN_INICIAL = new Set([
	"SAC",
	"SAA",
	"SA",
	"EIRL",
	"SRL",
	"DE",
	"DEL",
	"LA",
	"LAS",
	"EL",
	"LOS",
]);

// Código de equipos de un proveedor a partir de su razón social: las iniciales
// (HUISE QUEA ANTOLIN → HQA) o las primeras letras si es una sola palabra (MAQSUR SAC → MAQ).
// Si ya lo usa otro proveedor, prueba con más letras.
export function sugerirPrefijo(razonSocial: string, usados: readonly string[] = []): string {
	const palabras = razonSocial
		.toUpperCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\b([A-Z])\.(?=[A-Z]\.)/g, "$1")
		.replace(/[^A-Z\s]/g, " ")
		.split(/\s+/)
		.filter((palabra) => palabra.length > 1 && !SIN_INICIAL.has(palabra));
	const letras = palabras.join("") || "PRV";
	const iniciales = palabras.length > 1 ? palabras.map((palabra) => palabra[0]).join("") : "";
	const candidatos = [
		iniciales.slice(0, 3),
		iniciales.slice(0, 4),
		letras.slice(0, 3),
		letras.slice(0, 4),
		...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letra) => `${letras.slice(0, 3)}${letra}`),
	];
	const ocupados = new Set([...usados, PREFIJO_PROPIO]);

	return (
		candidatos.find((candidato) => candidato.length >= 2 && !ocupados.has(candidato)) ??
		letras.slice(0, 3)
	);
}

export class PrefijoEquiposDuplicadoError extends Error {
	constructor(
		readonly prefijo: string,
		readonly codigoExistente: string,
	) {
		super(`El código de equipos ${prefijo} ya lo usa ${codigoExistente}.`);
		this.name = "PrefijoEquiposDuplicadoError";
	}
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
