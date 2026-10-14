// Reemplaza src/app/entorno.ts en Jest (no hay import.meta.env): sin Client ID, sesión de prueba.
export const entorno = {
	msalClientId: "",
	msalAuthority: "https://login.microsoftonline.com/common",
	sharepointSitio: "",
	rucApiUrl: "",
};

export const base = "/";

export function ruta(archivo: string): string {
	return `/${archivo}`;
}

export const basename = "/";
