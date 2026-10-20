// Variables de entorno de Vite (archivo .env). En las pruebas de Jest se reemplaza este módulo.
export const entorno = {
	// Client ID de la app registrada en Microsoft Entra ID. Vacío: se usa la sesión de prueba.
	msalClientId: (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined) ?? "",
	// "common" acepta cuentas de empresa y personales.
	msalAuthority:
		(import.meta.env.VITE_MSAL_AUTHORITY as string | undefined) ??
		"https://login.microsoftonline.com/common",
	// Sitio de SharePoint de H&M para sincronizar: "hmcontratistas.sharepoint.com:/sites/SistemaHM".
	// Vacío: los datos quedan solo en el dispositivo.
	sharepointSitio: (import.meta.env.VITE_SHAREPOINT_SITIO as string | undefined) ?? "",
	// Worker de consulta de RUC (worker/ruc): "https://hm-ruc.<cuenta>.workers.dev". Vacío: carga manual.
	rucApiUrl: (import.meta.env.VITE_RUC_API_URL as string | undefined) ?? "",
	// Worker de avisos por Telegram (worker/avisos): "https://hm-avisos.<cuenta>.workers.dev".
	// Vacío: no se suben los contratos y no hay avisos por Telegram.
	avisosApiUrl: (import.meta.env.VITE_AVISOS_API_URL as string | undefined) ?? "",
};

// Ruta base de la app ("/" en local, "/hm-valorizaciones/" en GitHub Pages), siempre con "/" final.
export const base = import.meta.env.BASE_URL;

// Dirección de un archivo de public/ respetando la ruta base: ruta("logo-hm.png").
export function ruta(archivo: string): string {
	return `${base}${archivo}`;
}

// Para React Router: sin "/" final ("/hm-valorizaciones"), o "/" en local.
export const basename = base === "/" ? "/" : base.replace(/\/$/, "");
