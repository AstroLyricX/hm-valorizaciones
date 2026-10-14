import { useSyncExternalStore } from "react";

import { type EstadoInstalacion, estadoInstalacion, suscribirInstalacion } from "./instalacion";

export function useInstalacion(): EstadoInstalacion {
	return useSyncExternalStore(suscribirInstalacion, estadoInstalacion, () => "no-disponible");
}
