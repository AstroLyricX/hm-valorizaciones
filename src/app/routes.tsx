import { Navigate, type RouteObject } from "react-router";

import { LoginPage } from "@/features/auth/LoginPage";
import { RequireRol } from "@/features/auth/RequireRol";
import { RequireSession } from "@/features/auth/RequireSession";
import { ClientesPage } from "@/features/clientes/ClientesPage";
import { ConfiguracionPage } from "@/features/configuracion/ConfiguracionPage";
import { ContratoDetallePage } from "@/features/contratos/ContratoDetallePage";
import { ContratosPage } from "@/features/contratos/ContratosPage";
import { EquiposPage } from "@/features/equipos/EquiposPage";
import { InicioPage } from "@/features/inicio/InicioPage";
import { NuevaValorizacionPage } from "@/features/valorizaciones/NuevaValorizacionPage";
import { ValorizacionesPage } from "@/features/valorizaciones/ValorizacionesPage";
import { ValorizacionPage } from "@/features/valorizaciones/ValorizacionPage";

import { ErrorPage } from "./ErrorPage";
import { AppLayout } from "./layout/AppLayout";

export const routes: RouteObject[] = [
	{ path: "/login", element: <LoginPage />, errorElement: <ErrorPage /> },
	{
		element: <RequireSession />,
		errorElement: <ErrorPage />,
		children: [
			{
				element: <AppLayout />,
				children: [
					{ path: "/", element: <InicioPage /> },
					{ path: "/valorizaciones", element: <ValorizacionesPage /> },
					{ path: "/valorizaciones/nueva", element: <NuevaValorizacionPage /> },
					{ path: "/valorizaciones/:id", element: <ValorizacionPage /> },
					{ path: "/contratos", element: <ContratosPage /> },
					{ path: "/contratos/:id", element: <ContratoDetallePage /> },
					{ path: "/equipos", element: <EquiposPage /> },
					{ path: "/clientes", element: <ClientesPage /> },
					{
						element: <RequireRol accion="configurar" />,
						children: [{ path: "/configuracion", element: <ConfiguracionPage /> }],
					},
				],
			},
		],
	},
	{ path: "*", element: <Navigate to="/" replace /> },
];
