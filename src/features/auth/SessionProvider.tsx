import { PublicClientApplication } from "@azure/msal-browser";
import type { ReactNode } from "react";

import { entorno } from "@/app/entorno";

import { DemoSessionProvider } from "./DemoSessionProvider";
import { MsalSessionProvider } from "./MsalSessionProvider";

// Con Client ID configurado (.env) se inicia sesión con Microsoft; si no, con la sesión de prueba.
const clienteMsal = entorno.msalClientId
	? new PublicClientApplication({
			auth: {
				clientId: entorno.msalClientId,
				authority: entorno.msalAuthority,
				redirectUri: `${window.location.origin}/login`,
				postLogoutRedirectUri: `${window.location.origin}/login`,
			},
			// localStorage: la sesión sobrevive al cierre de la app y sirve sin conexión.
			cache: { cacheLocation: "localStorage" },
		})
	: null;

export function SessionProvider({ children }: { children: ReactNode }) {
	return clienteMsal ? (
		<MsalSessionProvider cliente={clienteMsal}>{children}</MsalSessionProvider>
	) : (
		<DemoSessionProvider>{children}</DemoSessionProvider>
	);
}
