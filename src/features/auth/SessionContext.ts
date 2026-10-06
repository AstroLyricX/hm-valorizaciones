import { createContext } from "react";

// Hasta el login con Microsoft (fase 11) la sesión de prueba es de administrador.
export type Rol = "ADMIN" | "OPERADOR";

export interface SessionUser {
	name: string;
	email: string;
	rol: Rol;
}

export interface Session {
	user: SessionUser | null;
	isSigningIn: boolean;
	signIn: () => Promise<void>;
	signOut: () => void;
}

export const SessionContext = createContext<Session | null>(null);
