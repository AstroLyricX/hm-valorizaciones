import type { AccountInfo } from "@azure/msal-browser";

import type { Rol, SessionUser } from "./SessionContext";

// Acciones reservadas al administrador (decisión D2). El operador registra clientes, equipos,
// contratos y valorizaciones, pero no cambia la configuración ni anula valorizaciones.
export type Accion = "configurar" | "anular";

export function puede(rol: Rol | undefined, _accion: Accion): boolean {
	return rol === "ADMIN";
}

// Los roles vienen del token de Entra ID ("App roles" de la app registrada). Sin rol asignado,
// o con una cuenta personal (que no trae roles), el usuario es OPERADOR.
export function rolDesdeClaims(roles: unknown): Rol {
	return Array.isArray(roles) && roles.includes("ADMIN") ? "ADMIN" : "OPERADOR";
}

export function usuarioDesdeCuenta(cuenta: AccountInfo): SessionUser {
	const claims = cuenta.idTokenClaims as { roles?: unknown; email?: unknown } | undefined;
	const correo = typeof claims?.email === "string" ? claims.email : cuenta.username;

	return {
		name: cuenta.name ?? correo,
		email: correo.toLowerCase(),
		rol: rolDesdeClaims(claims?.roles),
	};
}
