import { type ReactNode, useCallback, useMemo, useState } from "react";

import { type Session, SessionContext, type SessionUser } from "./SessionContext";

// Sesión de prueba hasta la fase 11 (MSAL). Mantiene la misma interfaz que tendrá el login real.
const STORAGE_KEY = "hm.session";
const DEMO_USER: SessionUser = { name: "Usuario de prueba", email: "demo@hm.local", rol: "ADMIN" };
const DEMO_SIGN_IN_DELAY_MS = 600;

function readStoredUser(): SessionUser | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return null;
		}
		const guardado = JSON.parse(raw) as Partial<SessionUser>;

		// Las sesiones guardadas antes de los roles no lo traen.
		return { ...guardado, rol: guardado.rol ?? "ADMIN" } as SessionUser;
	} catch {
		return null;
	}
}

function storeUser(user: SessionUser | null): void {
	try {
		if (user) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// Sin almacenamiento disponible: la sesión dura solo mientras la pestaña esté abierta.
	}
}

export function SessionProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<SessionUser | null>(readStoredUser);
	const [isSigningIn, setIsSigningIn] = useState(false);

	const signIn = useCallback(async () => {
		setIsSigningIn(true);
		await new Promise((resolve) => {
			setTimeout(resolve, DEMO_SIGN_IN_DELAY_MS);
		});
		storeUser(DEMO_USER);
		setUser(DEMO_USER);
		setIsSigningIn(false);
	}, []);

	const signOut = useCallback(() => {
		storeUser(null);
		setUser(null);
	}, []);

	const session = useMemo<Session>(
		() => ({ user, isSigningIn, signIn, signOut }),
		[user, isSigningIn, signIn, signOut],
	);

	return <SessionContext value={session}>{children}</SessionContext>;
}
