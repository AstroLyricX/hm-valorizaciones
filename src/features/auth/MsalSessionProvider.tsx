import { InteractionRequiredAuthError, type IPublicClientApplication } from "@azure/msal-browser";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { ruta } from "@/app/entorno";

import { PERMISOS_LOGIN, PERMISOS_SYNC } from "./permisos";
import { usuarioDesdeCuenta } from "./roles";
import {
	ReautenticacionRequeridaError,
	type Session,
	SessionContext,
	type SessionUser,
} from "./SessionContext";

export type ClienteMsal = Pick<
	IPublicClientApplication,
	| "initialize"
	| "handleRedirectPromise"
	| "getActiveAccount"
	| "getAllAccounts"
	| "setActiveAccount"
	| "loginRedirect"
	| "logoutRedirect"
	| "clearCache"
	| "acquireTokenSilent"
	| "acquireTokenRedirect"
>;

// Login con Microsoft (Auth Code + PKCE, por redirección: funciona también en la PWA instalada).
// La cuenta queda guardada en el dispositivo: sin conexión se sigue trabajando con ella.
export function MsalSessionProvider({
	cliente,
	children,
}: {
	cliente: ClienteMsal;
	children: ReactNode;
}) {
	const [user, setUser] = useState<SessionUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSigningIn, setIsSigningIn] = useState(false);
	const [destino, setDestino] = useState<string | null>(null);

	useEffect(() => {
		// Se usa un objeto para que el cierre vea el cambio al desmontar.
		const montado = { activo: true };
		void (async () => {
			try {
				await cliente.initialize();
				// Al volver de la página de Microsoft llega la cuenta y la ruta de origen (state).
				const resultado = await cliente.handleRedirectPromise();
				if (resultado?.account) {
					cliente.setActiveAccount(resultado.account);
				}
				const cuenta = cliente.getActiveAccount() ?? cliente.getAllAccounts().at(0) ?? null;
				if (cuenta) {
					cliente.setActiveAccount(cuenta);
				}
				if (montado.activo) {
					setUser(cuenta ? usuarioDesdeCuenta(cuenta) : null);
					setDestino(resultado?.state ?? null);
				}
			} catch (error) {
				console.error(error);
			} finally {
				if (montado.activo) {
					setIsLoading(false);
				}
			}
		})();

		return () => {
			montado.activo = false;
		};
	}, [cliente]);

	const signIn = useCallback(
		async (ruta?: string) => {
			setIsSigningIn(true);
			try {
				await cliente.loginRedirect({
					scopes: PERMISOS_LOGIN,
					state: ruta,
					prompt: "select_account",
				});
			} catch (error) {
				console.error(error);
				setIsSigningIn(false);
			}
		},
		[cliente],
	);

	// Con conexión se cierra también la sesión de Microsoft; sin conexión solo la del dispositivo.
	const signOut = useCallback(async () => {
		const cuenta = cliente.getActiveAccount();
		setUser(null);
		if (navigator.onLine) {
			await cliente.logoutRedirect({
				account: cuenta ?? undefined,
				postLogoutRedirectUri: `${window.location.origin}${ruta("login")}`,
			});

			return;
		}
		await cliente.clearCache({ account: cuenta ?? undefined });
		cliente.setActiveAccount(null);
	}, [cliente]);

	// Token silencioso (de la caché o renovado en segundo plano). Si Microsoft exige volver a
	// iniciar sesión, no se interrumpe al usuario: la sincronización lo avisa.
	const obtenerToken = useCallback(async () => {
		const cuenta = cliente.getActiveAccount();
		if (!cuenta) {
			throw new ReautenticacionRequeridaError();
		}
		try {
			return (await cliente.acquireTokenSilent({ scopes: PERMISOS_SYNC, account: cuenta }))
				.accessToken;
		} catch (error) {
			if (error instanceof InteractionRequiredAuthError) {
				throw new ReautenticacionRequeridaError();
			}
			throw error;
		}
	}, [cliente]);

	const reautenticar = useCallback(async () => {
		await cliente.acquireTokenRedirect({
			scopes: PERMISOS_SYNC,
			account: cliente.getActiveAccount() ?? undefined,
			state: window.location.pathname,
		});
	}, [cliente]);

	const session = useMemo<Session>(
		() => ({
			user,
			isLoading,
			isSigningIn,
			destino,
			modo: "microsoft",
			signIn,
			signOut,
			obtenerToken,
			reautenticar,
		}),
		[user, isLoading, isSigningIn, destino, signIn, signOut, obtenerToken, reautenticar],
	);

	return <SessionContext value={session}>{children}</SessionContext>;
}
