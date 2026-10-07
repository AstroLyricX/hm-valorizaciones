import { Navigate, Outlet } from "react-router";

import { type Accion, puede } from "./roles";
import { useSession } from "./useSession";

// Rutas reservadas al administrador: un operador vuelve a Inicio.
export function RequireRol({ accion }: { accion: Accion }) {
	const { user } = useSession();

	return puede(user?.rol, accion) ? <Outlet /> : <Navigate to="/" replace />;
}
