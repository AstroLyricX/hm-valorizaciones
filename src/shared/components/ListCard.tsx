import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";

// Contenedor de un listado: barra de búsqueda y filtros, contenido y pie con el contador.
export function ListCard({
	busqueda,
	onBusquedaChange,
	placeholder,
	filtros,
	children,
	total,
	visibles,
}: {
	busqueda: string;
	onBusquedaChange: (valor: string) => void;
	placeholder: string;
	filtros?: ReactNode;
	children: ReactNode;
	total: number;
	visibles: number;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card">
			<div className="flex flex-col gap-3 border-b border-navy-100 p-4 md:flex-row md:items-center">
				<div className="relative flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-400"
						aria-hidden="true"
					/>
					<Input
						type="search"
						value={busqueda}
						onChange={(event) => onBusquedaChange(event.target.value)}
						placeholder={placeholder}
						aria-label="Buscar"
						className="h-10 pl-9"
					/>
				</div>
				{filtros && <div className="grid grid-cols-2 gap-3 md:flex">{filtros}</div>}
			</div>
			{children}
			<p className="border-t border-navy-100 bg-navy-50/60 px-4 py-2.5 text-[13px] text-muted-foreground">
				{visibles} de {total} {total === 1 ? "registro" : "registros"}
			</p>
		</div>
	);
}
