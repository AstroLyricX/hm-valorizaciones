import { Eye, type LucideIcon, Pencil, Power, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

const ESTILO = {
	editar: { icono: Pencil, clase: "text-teal-700 hover:bg-teal-50" },
	ver: { icono: Eye, clase: "text-brand-700 hover:bg-brand-50" },
	eliminar: { icono: Trash2, clase: "text-red-600 hover:bg-red-50" },
	desactivar: { icono: Power, clase: "text-red-600 hover:bg-red-50" },
	activar: { icono: Power, clase: "text-emerald-700 hover:bg-emerald-50" },
} satisfies Record<string, { icono: LucideIcon; clase: string }>;

export type TipoAccion = keyof typeof ESTILO;

// Botones de acción de una fila, discretos: el color del ícono indica la acción y el fondo
// aparece al pasar el mouse. Editar (verde azulado), ver (azul), desactivar (rojo).
export function AccionesFila({
	acciones,
}: {
	acciones: { tipo: TipoAccion; etiqueta: string; onClick: () => void }[];
}) {
	return (
		<div className="flex items-center justify-end gap-1">
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
							"flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
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
