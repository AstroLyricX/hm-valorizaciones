import { createContext } from "react";

export interface SessionUser {
	name: string;
	email: string;
}

export interface Session {
	user: SessionUser | null;
	isSigningIn: boolean;
	signIn: () => Promise<void>;
	signOut: () => void;
}

export const SessionContext = createContext<Session | null>(null);
