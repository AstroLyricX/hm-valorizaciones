import { Eye, type LucideIcon, Pencil, Power, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

const ESTILO = {
	editar: { icono: Pencil, clase: "bg-teal-500 hover:bg-teal-600" },
	ver: { icono: Eye, clase: "bg-amber-500 hover:bg-amber-600" },
	eliminar: { icono: Trash2, clase: "bg-red-600 hover:bg-red-700" },
	desactivar: { icono: Power, clase: "bg-red-600 hover:bg-red-700" },
	activar: { icono: Power, clase: "bg-emerald-600 hover:bg-emerald-700" },
} satisfies Record<string, { icono: LucideIcon; clase: string }>;

export type TipoAccion = keyof typeof ESTILO;

// Botones de acción de una fila: editar (verde azulado), ver (ámbar), eliminar/desactivar (rojo).
export function AccionesFila({
	acciones,
}: {
	acciones: { tipo: TipoAccion; etiqueta: string; onClick: () => void }[];
}) {
	return (
		<div className="flex items-center justify-center gap-1.5">
			{acciones.map(({ tipo, etiqueta, onClick }) => {
				const { icono: Icono, clase } = ESTILO[tipo];

				return (
					<button
						key={tipo}
						type="button"
						title={etiqueta}
						aria-label={etiqueta}
						onClick={(event) => {
							event.stopPropagation();
							onClick();
						}}
						className={cn(
							"flex size-8 items-center justify-center rounded-md text-white shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
							clase,
						)}
					>
						<Icono className="size-4" aria-hidden="true" />
					</button>
				);
			})}
		</div>
	);
}
