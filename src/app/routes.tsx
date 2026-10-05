import { Navigate, type RouteObject } from "react-router";

import { LoginPage } from "@/features/auth/LoginPage";
import { RequireSession } from "@/features/auth/RequireSession";
import { ClientesPage } from "@/features/clientes/ClientesPage";
import { ConfiguracionPage } from "@/features/configuracion/ConfiguracionPage";
import { ContratosPage } from "@/features/contratos/ContratosPage";
import { EquiposPage } from "@/features/equipos/EquiposPage";
import { InicioPage } from "@/features/inicio/InicioPage";
import { NuevaValorizacionPage } from "@/features/valorizaciones/NuevaValorizacionPage";
import { ValorizacionesPage } from "@/features/valorizaciones/ValorizacionesPage";

import { AppLayout } from "./layout/AppLayout";

export const routes: RouteObject[] = [
	{ path: "/login", element: <LoginPage /> },
	{
		element: <RequireSession />,
		children: [
			{
				element: <AppLayout />,
				children: [
					{ path: "/", element: <InicioPage /> },
					{ path: "/valorizaciones", element: <ValorizacionesPage /> },
					{ path: "/valorizaciones/nueva", element: <NuevaValorizacionPage /> },
					{ path: "/contratos", element: <ContratosPage /> },
					{ path: "/equipos", element: <EquiposPage /> },
					{ path: "/clientes", element: <ClientesPage /> },
					{ path: "/configuracion", element: <ConfiguracionPage /> },
				],
			},
		],
	},
	{ path: "*", element: <Navigate to="/" replace /> },
];
