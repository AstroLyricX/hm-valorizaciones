import { useState } from "react";
import { toast } from "sonner";

import { instalarApp } from "./instalacion";
import { useInstalacion } from "./useInstalacion";

// Lógica común del botón "Instalar app": diálogo del navegador o pasos para iPhone.
export interface BotonInstalar {
	visible: boolean;
	instalar: () => Promise<void>;
	pasosIos: boolean;
	setPasosIos: (abierto: boolean) => void;
}

export function useBotonInstalar(): BotonInstalar {
	const estado = useInstalacion();
	const [pasosIos, setPasosIos] = useState(false);

	const instalar = async () => {
		if (estado === "ios") {
			setPasosIos(true);

			return;
		}
		if (await instalarApp()) {
			toast.success("App instalada. Ábrela desde tu pantalla de inicio o tu escritorio.");
		}
	};

	return {
		visible: estado === "disponible" || estado === "ios",
		instalar,
		pasosIos,
		setPasosIos,
	};
}
