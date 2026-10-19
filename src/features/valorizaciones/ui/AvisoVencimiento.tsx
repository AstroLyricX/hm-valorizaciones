import { TriangleAlert } from "lucide-react";

import {
	type Contrato,
	diasParaVencer,
	textoVencimiento,
	vigenciaContrato,
} from "@/features/contratos/domain/contrato";
import { formatearFechaNumerica } from "@/lib/fechas";

// Alerta de la última semana del contrato.
export function AvisoVencimiento({
	contrato,
	hoy,
}: {
	contrato: Pick<Contrato, "codigo" | "fechaInicio" | "fechaFin">;
	hoy: string;
}) {
	if (vigenciaContrato(contrato, hoy) !== "POR_VENCER") {
		return null;
	}

	return (
		<div
			role="alert"
			className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
		>
			<TriangleAlert className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
			<span>
				<span className="font-semibold">
					{textoVencimiento(diasParaVencer(contrato, hoy))}: {contrato.codigo}
				</span>{" "}
				({formatearFechaNumerica(contrato.fechaFin)})
			</span>
		</div>
	);
}
