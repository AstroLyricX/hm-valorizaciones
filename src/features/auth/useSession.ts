import { useContext } from "react";

import { type Session, SessionContext } from "./SessionContext";

export function useSession(): Session {
	const session = useContext(SessionContext);

	if (!session) {
		throw new Error("useSession debe usarse dentro de <SessionProvider>");
	}

	return session;
}
