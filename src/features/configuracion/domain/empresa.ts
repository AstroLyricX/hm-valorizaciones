import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { rucValido } from "@/shared/domain/ruc";

// Registro único: los datos de H&M que encabezan cada valorización (hoja CONFIG del xlsm).
export const EMPRESA_ID = "empresa";

export const EmpresaDatosSchema = z.object({
	razonSocial: z
		.string()
		.trim()
		.min(3, "Ingresa la razón social.")
		.max(150, "Máximo 150 caracteres."),
	ruc: z
		.string()
		.trim()
		.regex(/^\d{11}$/, "El RUC debe tener 11 dígitos.")
		.refine(rucValido, "El RUC no es válido. Revisa los dígitos."),
	direccion: z
		.string()
		.trim()
		.min(5, "Ingresa la dirección legal.")
		.max(200, "Máximo 200 caracteres."),
	telefono: z
		.string()
		.trim()
		.regex(/^[\d\s+-]{6,20}$/, "Ingresa solo números, espacios o guiones.")
		.or(z.literal("")),
	igvPorcentaje: z
		.number({ error: "Ingresa el IGV." })
		.min(0, "El IGV no puede ser negativo.")
		.max(100, "El IGV no puede superar 100 %.")
		.multipleOf(0.01, "Máximo 2 decimales."),
});

export const EmpresaSchema = BaseSchema.extend(EmpresaDatosSchema.shape);

export type EmpresaDatos = z.infer<typeof EmpresaDatosSchema>;
export type Empresa = z.infer<typeof EmpresaSchema>;

// Valores iniciales tomados de la hoja CONFIG de "VALORIZACIONES H&M.xlsm".
export const EMPRESA_INICIAL: EmpresaDatos = {
	razonSocial: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L.",
	ruc: "20602629903",
	direccion: "Av. Circunvalacion S/N Ollachea-Carabaya-Puno",
	telefono: "963313151",
	igvPorcentaje: 18,
};
