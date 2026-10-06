import type { ReactNode } from "react";

// Grupo de campos dentro de un formulario modal, con título y cuadrícula de dos columnas.
export function FormSeccion({ titulo, children }: { titulo?: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3 border-b border-navy-100 pb-5 last:border-b-0 last:pb-0 [&+&]:pt-5">
			{titulo && <h3 className="text-sm font-semibold text-navy-800">{titulo}</h3>}
			<div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>
		</section>
	);
}
