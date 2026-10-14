import { Download, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { PasosIos } from "./PasosIos";
import { useBotonInstalar } from "./useBotonInstalar";

const DESCARTADO = "hm.instalacion.descartada";

function leerDescartado(): boolean {
	try {
		return localStorage.getItem(DESCARTADO) === "1";
	} catch {
		return false;
	}
}

// Invitación a instalar la app, en Inicio. Se puede cerrar y no vuelve a aparecer en este equipo.
export function AvisoInstalacion() {
	const { visible, instalar, pasosIos, setPasosIos } = useBotonInstalar();
	const [descartado, setDescartado] = useState(leerDescartado);

	if (!visible || descartado) {
		return null;
	}

	const descartar = () => {
		setDescartado(true);
		try {
			localStorage.setItem(DESCARTADO, "1");
		} catch {
			// Sin almacenamiento: vuelve a aparecer en la próxima visita.
		}
	};

	return (
		<section
			aria-label="Instalar la app"
			className="flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center"
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600">
				<Download className="size-5" aria-hidden="true" />
			</span>
			<div className="flex flex-1 flex-col gap-0.5">
				<p className="text-sm font-semibold text-navy-900">Instala la app en este dispositivo</p>
				<p className="text-[13px] text-navy-600">
					Ábrela desde tu pantalla de inicio, en su propia ventana, y úsala sin internet.
				</p>
			</div>
			<div className="flex gap-2">
				<Button
					className="h-9 bg-brand-600 px-3.5 hover:bg-brand-700"
					onClick={() => void instalar()}
				>
					<Download />
					Instalar app
				</Button>
				<Button variant="ghost" className="h-9 px-3 text-navy-600" onClick={descartar}>
					<X />
					Ahora no
				</Button>
			</div>
			<PasosIos open={pasosIos} onOpenChange={setPasosIos} />
		</section>
	);
}
