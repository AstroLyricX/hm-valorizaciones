import { Share, SquarePlus } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

// En iPhone y iPad la app se instala desde Safari: Compartir → Agregar a pantalla de inicio.
export function PasosIos({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const pasos = [
		{
			icono: Share,
			texto: "Toca Compartir (el cuadrado con la flecha hacia arriba), abajo en Safari.",
		},
		{ icono: SquarePlus, texto: "Elige «Agregar a pantalla de inicio» y luego «Agregar»." },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Instalar en iPhone o iPad</DialogTitle>
					<DialogDescription>
						Hazlo desde Safari. Después la abres desde tu pantalla de inicio, como cualquier app, y
						funciona sin internet.
					</DialogDescription>
				</DialogHeader>
				<ol className="flex flex-col gap-3">
					{pasos.map(({ icono: Icono, texto }, indice) => (
						<li key={texto} className="flex items-start gap-3 text-sm text-navy-700">
							<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-700">
								{indice + 1}
							</span>
							<span className="flex flex-1 items-start gap-2 pt-1.5">
								<Icono className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
								{texto}
							</span>
						</li>
					))}
				</ol>
			</DialogContent>
		</Dialog>
	);
}
