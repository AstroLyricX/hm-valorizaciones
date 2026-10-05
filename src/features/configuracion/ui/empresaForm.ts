import { z } from "zod";

import { type EmpresaDatos, EmpresaDatosSchema } from "../domain/empresa";

// En el formulario el IGV se escribe como texto ("18" o "18.5") y se convierte a número al validar.
export const EmpresaFormSchema = EmpresaDatosSchema.extend({
	igvPorcentaje: z
		.string()
		.trim()
		.min(1, "Ingresa el IGV.")
		.regex(/^\d{1,3}([.,]\d{1,2})?$/, "Ingresa un porcentaje, por ejemplo 18.")
		.transform((valor) => Number(valor.replace(",", ".")))
		.pipe(EmpresaDatosSchema.shape.igvPorcentaje),
});

export type EmpresaFormInput = z.input<typeof EmpresaFormSchema>;

export function aFormulario(datos: EmpresaDatos): EmpresaFormInput {
	return { ...datos, igvPorcentaje: String(datos.igvPorcentaje) };
}
