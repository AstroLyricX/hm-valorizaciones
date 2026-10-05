import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { rucValido } from "@/shared/domain/ruc";

// Clientes y proveedores (hoja CLIENTES del xlsm). El tipo resuelve la decisión D1 del plan.
export const TIPOS_TERCERO = ["CLIENTE", "PROVEEDOR"] as const;
export const ESTADOS_TERCERO = ["ACTIVO", "INACTIVO"] as const;

export type TipoTercero = (typeof TIPOS_TERCERO)[number];
export type EstadoTercero = (typeof ESTADOS_TERCERO)[number];

export const ETIQUETA_TIPO: Record<TipoTercero, string> = {
	CLIENTE: "Cliente",
	PROVEEDOR: "Proveedor",
};

export const ETIQUETA_ESTADO: Record<EstadoTercero, string> = {
	ACTIVO: "Activo",
	INACTIVO: "Inactivo",
};

const textoOpcional = (max: number) =>
	z.string().trim().max(max, `Máximo ${max} caracteres.`).or(z.literal(""));

export const TerceroDatosSchema = z.object({
	tipo: z.enum(TIPOS_TERCERO, { error: "Elige si es cliente o proveedor." }),
	razonSocial: z
		.string()
		.trim()
		.min(3, "Ingresa la razón social o el nombre completo.")
		.max(150, "Máximo 150 caracteres.")
		.transform((valor) => valor.toUpperCase()),
	ruc: z
		.string()
		.trim()
		.regex(/^\d{11}$/, "El RUC debe tener 11 dígitos.")
		.refine(rucValido, "El RUC no es válido. Revisa los dígitos."),
	direccion: textoOpcional(200),
	contacto: textoOpcional(100),
	telefono: z
		.string()
		.trim()
		.regex(/^[\d\s+-]{6,20}$/, "Ingresa solo números, espacios o guiones.")
		.or(z.literal("")),
	correo: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.email("Ingresa un correo válido, por ejemplo nombre@empresa.com."))
		.or(z.literal("")),
});

export const TerceroSchema = BaseSchema.extend({
	...TerceroDatosSchema.shape,
	codigo: z.string().regex(/^CLI-\d{3,}$/),
	estado: z.enum(ESTADOS_TERCERO),
});

export type TerceroDatos = z.infer<typeof TerceroDatosSchema>;
export type TerceroDatosInput = z.input<typeof TerceroDatosSchema>;
export type Tercero = z.infer<typeof TerceroSchema>;

const PREFIJO_CODIGO = "CLI-";

// Siguiente código correlativo (CLI-001, CLI-002…), igual que GenerarCodigoCliente del xlsm.
export function siguienteCodigo(codigos: readonly string[]): string {
	const mayor = codigos.reduce((max, codigo) => {
		const numero = Number(codigo.slice(PREFIJO_CODIGO.length));

		return codigo.startsWith(PREFIJO_CODIGO) && Number.isInteger(numero)
			? Math.max(max, numero)
			: max;
	}, 0);

	return `${PREFIJO_CODIGO}${String(mayor + 1).padStart(3, "0")}`;
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
