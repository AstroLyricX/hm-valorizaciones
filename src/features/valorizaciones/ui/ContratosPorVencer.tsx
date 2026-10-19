import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";

import {
	type Contrato,
	diasParaVencer,
	textoVencimiento,
} from "@/features/contratos/domain/contrato";
import { formatearFechaNumerica } from "@/lib/fechas";

// Contratos a los que les queda una semana o menos.
export function ContratosPorVencer({
	contratos,
	hoy,
}: {
	contratos: readonly Contrato[];
	hoy: string;
}) {
	if (contratos.length === 0) {
		return null;
	}

	return (
		<section
			aria-label="Contratos por vencer"
			className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
		>
			<TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
			<div className="flex min-w-0 flex-col gap-1">
				<span className="font-semibold">
					{contratos.length === 1
						? "Un contrato vence esta semana"
						: `${contratos.length} contratos vencen esta semana`}
				</span>
				<ul className="flex flex-col gap-0.5">
					{contratos.map((contrato) => (
						<li key={contrato.id}>
							<Link
								to={`/contratos/${contrato.id}`}
								className="font-medium underline underline-offset-2 hover:text-amber-950"
							>
								{contrato.codigo} · {contrato.proyecto}
							</Link>{" "}
							— {textoVencimiento(diasParaVencer(contrato, hoy)).toLowerCase()} (
							{formatearFechaNumerica(contrato.fechaFin)})
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
