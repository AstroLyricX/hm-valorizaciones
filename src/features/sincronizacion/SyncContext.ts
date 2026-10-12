import { createContext, useContext } from "react";

export type EstadoSync =
	// Sin sitio de SharePoint o con la sesión de prueba: los datos quedan en el dispositivo.
	| "desactivada"
	| "sin-conexion"
	| "sincronizando"
	| "al-dia"
	| "pendiente"
	// Microsoft pide volver a iniciar sesión.
	| "reautenticar"
	| "error";

export interface Sincronizacion {
	estado: EstadoSync;
	activa: boolean;
	// Cambios y PDFs de este dispositivo que aún no llegan a SharePoint.
	pendientes: number;
	ultima: string | null;
	sincronizar: () => Promise<void>;
	reautenticar: () => Promise<void>;
}

const INACTIVA: Sincronizacion = {
	estado: "desactivada",
	activa: false,
	pendientes: 0,
	ultima: null,
	sincronizar: async () => Promise.resolve(),
	reautenticar: async () => Promise.resolve(),
};

export const SyncContext = createContext<Sincronizacion>(INACTIVA);

export function useSincronizacion(): Sincronizacion {
	return useContext(SyncContext);
}
