// Reemplaza src/app/entorno.ts en Jest (no hay import.meta.env): sin Client ID, sesión de prueba.
export const entorno = {
	msalClientId: "",
	msalAuthority: "https://login.microsoftonline.com/common",
};
