import { createContext } from "react";

// ADMIN: todo. OPERADOR: carga los datos y las valorizaciones (decisión D2).
export type Rol = "ADMIN" | "OPERADOR";

export interface SessionUser {
	name: string;
	email: string;
	rol: Rol;
}

export interface Session {
	user: SessionUser | null;
	// Mientras se lee la sesión guardada o se procesa la vuelta del login de Microsoft.
	isLoading: boolean;
	isSigningIn: boolean;
	// Ruta a la que volver después del login con redirección.
	destino: string | null;
	// "prueba": sin Client ID configurado; "microsoft": login real con MSAL.
	modo: "prueba" | "microsoft";
	signIn: (destino?: string) => Promise<void>;
	signOut: () => Promise<void>;
	// Token de Microsoft Graph para la sincronización; solo con login de Microsoft.
	obtenerToken?: () => Promise<string>;
	// Vuelve a pedir el login cuando Microsoft lo exige (contraseña cambiada, sesión vencida…).
	reautenticar?: () => Promise<void>;
}

// Microsoft pide volver a iniciar sesión: la sincronización espera a que el usuario lo haga.
export class ReautenticacionRequeridaError extends Error {
	constructor() {
		super("Vuelve a iniciar sesión con Microsoft para sincronizar.");
		this.name = "ReautenticacionRequeridaError";
	}
}

export const SessionContext = createContext<Session | null>(null);
