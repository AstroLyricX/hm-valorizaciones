// Variables de entorno de Vite (archivo .env). En las pruebas de Jest se reemplaza este módulo.
export const entorno = {
	// Client ID de la app registrada en Microsoft Entra ID. Vacío: se usa la sesión de prueba.
	msalClientId: (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined) ?? "",
	// "common" acepta cuentas de empresa y personales.
	msalAuthority:
		(import.meta.env.VITE_MSAL_AUTHORITY as string | undefined) ??
		"https://login.microsoftonline.com/common",
};
