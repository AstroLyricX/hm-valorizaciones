import { Navigate, type RouteObject } from "react-router";

import { LoginPage } from "@/features/auth/LoginPage";
import { RequireSession } from "@/features/auth/RequireSession";
import { InicioPage } from "@/features/inicio/InicioPage";

export const routes: RouteObject[] = [
	{ path: "/login", element: <LoginPage /> },
	{
		element: <RequireSession />,
		children: [{ path: "/", element: <InicioPage /> }],
	},
	{ path: "*", element: <Navigate to="/" replace /> },
];
