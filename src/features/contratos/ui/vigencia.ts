import { formatearFechaCorta } from "@/lib/fechas";

import type { Contrato } from "../domain/contrato";

export function vigencia(contrato: Pick<Contrato, "fechaInicio" | "fechaFin">): string {
	return `${formatearFechaCorta(contrato.fechaInicio)} – ${formatearFechaCorta(contrato.fechaFin)}`;
}
