import { hoyIso } from "@/features/contratos/domain/contrato";

import type { Planilla } from "../application/ValorizacionService";
import { montoEnLetras } from "../domain/montoEnLetras";
import type { ValorizacionCalculada } from "../domain/valorizacion";

export interface DatosPdf {
	planilla: Planilla;
	calculo: ValorizacionCalculada;
	// URL o data URI del logo (en el navegador, "/logo-hm.png").
	logo: string;
}

// "VAL-0002-2026-CTR-001.pdf"; un borrador lleva su periodo: "VAL-BORRADOR-2026-08-CTR-001.pdf".
export function nombreArchivoPdf(planilla: Pick<Planilla, "valorizacion" | "contrato">): string {
	const { valorizacion, contrato } = planilla;
	const identificador = valorizacion.numero ?? `BORRADOR-${valorizacion.periodo}`;

	return `VAL-${identificador}-${contrato.codigo}.pdf`;
}

// Fecha que se imprime: la de emisión, o la de hoy mientras es borrador.
export function fechaDelPdf(planilla: Pick<Planilla, "valorizacion">): string {
	return planilla.valorizacion.fechaEmision ?? hoyIso();
}

export function letrasDelPdf({
	planilla,
	calculo,
}: Pick<DatosPdf, "planilla" | "calculo">): string {
	return (
		planilla.valorizacion.montoEnLetras ??
		montoEnLetras(calculo.actual.total, planilla.valorizacion.moneda)
	);
}
