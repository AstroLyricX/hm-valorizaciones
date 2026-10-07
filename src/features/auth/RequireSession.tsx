import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router";

import { useSession } from "./useSession";

export function RequireSession() {
	const { user, isLoading } = useSession();
	const location = useLocation();

	if (isLoading) {
		return (
			<div
				role="status"
				aria-label="Cargando sesión"
				className="flex min-h-svh items-center justify-center"
			>
				<LoaderCircle className="size-6 animate-spin text-brand-600" aria-hidden="true" />
			</div>
		);
	}
	if (!user) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return <Outlet />;
}
