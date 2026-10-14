import { z } from "zod";

import { aCentavos, deCentavos } from "@/lib/dinero";

import {
	type Contrato,
	type ContratoDatos,
	ContratoDatosSchema,
	type ContratoEquipo,
	ContratoEquipoDatosSchema,
	parcialEquipo,
} from "../domain/contrato";

// En el formulario los números se escriben como texto y admiten coma decimal ("47,50").
// Esta etapa solo convierte; si el texto no es válido produce NaN y el esquema del dominio
// muestra su mensaje. Así todos los errores aparecen a la vez.
function aNumero(valor: string): number {
	const texto = valor.trim().replace(",", ".");

	return /^\d+(\.\d{1,2})?$/.test(texto) ? Number(texto) : Number.NaN;
}

const EquipoFormSchema = z.object({
	id: z.string().optional(),
	equipoId: z.string(),
	horasMinimas: z.string().transform((valor) => valor.trim().replace(",", ".")),
	costoHora: z.string().transform((valor) => {
		const costo = aNumero(valor);

		return Number.isNaN(costo) ? costo : aCentavos(costo);
	}),
});

export const ContratoFormSchema = z
	.object({
		tipo: z.string(),
		terceroId: z.string(),
		proyecto: z.string(),
		ubicacion: z.string(),
		documentoContractual: z.string(),
		fechaInicio: z.string(),
		fechaFin: z.string(),
		// Soles por defecto; también se puede pactar en dólares.
		moneda: z.string(),
		fondoGarantiaPct: z.string().transform((valor) => (valor.trim() === "" ? 0 : aNumero(valor))),
		observaciones: z.string(),
		equipos: z.array(EquipoFormSchema),
	})
	.pipe(ContratoDatosSchema);

export type ContratoFormInput = z.input<typeof ContratoFormSchema>;
export type EquipoFormInput = ContratoFormInput["equipos"][number];
export type { ContratoDatos };

export const EQUIPO_VACIO: EquipoFormInput = { equipoId: "", horasMinimas: "", costoHora: "" };

export const FORMULARIO_VACIO: ContratoFormInput = {
	tipo: "EMITIDO",
	terceroId: "",
	proyecto: "",
	ubicacion: "",
	documentoContractual: "",
	fechaInicio: "",
	fechaFin: "",
	moneda: "PEN",
	fondoGarantiaPct: "",
	observaciones: "",
	equipos: [],
};

export function aFormulario(
	contrato: Contrato,
	equipos: readonly ContratoEquipo[],
): ContratoFormInput {
	return {
		tipo: contrato.tipo,
		terceroId: contrato.terceroId,
		proyecto: contrato.proyecto,
		ubicacion: contrato.ubicacion,
		documentoContractual: contrato.documentoContractual,
		fechaInicio: contrato.fechaInicio,
		fechaFin: contrato.fechaFin,
		moneda: contrato.moneda,
		fondoGarantiaPct: contrato.fondoGarantiaPct === 0 ? "" : String(contrato.fondoGarantiaPct),
		observaciones: contrato.observaciones,
		equipos: equipos.map((equipo) => ({
			id: equipo.id,
			equipoId: equipo.equipoId,
			horasMinimas: equipo.horasMinimas,
			costoHora: deCentavos(equipo.costoHora),
		})),
	};
}

// Parcial en vivo mientras se escribe; 0 si las horas o el costo aún no son válidos.
export function parcialEnVivo(equipo: Pick<EquipoFormInput, "horasMinimas" | "costoHora">): number {
	const horas = equipo.horasMinimas.trim().replace(",", ".");
	const costo = aNumero(equipo.costoHora);

	if (
		!ContratoEquipoDatosSchema.shape.horasMinimas.safeParse(horas).success ||
		Number.isNaN(costo) ||
		costo <= 0
	) {
		return 0;
	}

	return parcialEquipo({ horasMinimas: horas, costoHora: aCentavos(costo) });
}
