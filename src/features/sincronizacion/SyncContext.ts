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
	// Causa del último fallo (por ejemplo "Graph respondió 403 en GET /sites/…").
	detalleError: string | null;
	// Primera descarga de los datos de la empresa en este dispositivo.
	descargando: boolean;
	// Cambios y PDFs de este dispositivo que aún no llegan a SharePoint.
	pendientes: number;
	ultima: string | null;
	sincronizar: () => Promise<void>;
	reautenticar: () => Promise<void>;
	// Baja de SharePoint un archivo adjunto; sin sincronización no hay de dónde bajarlo.
	descargarArchivo?: (ruta: string) => Promise<Blob>;
}

const INACTIVA: Sincronizacion = {
	estado: "desactivada",
	activa: false,
	detalleError: null,
	descargando: false,
	pendientes: 0,
	ultima: null,
	sincronizar: async () => Promise.resolve(),
	reautenticar: async () => Promise.resolve(),
};

export const SyncContext = createContext<Sincronizacion>(INACTIVA);

export function useSincronizacion(): Sincronizacion {
	return useContext(SyncContext);
}
