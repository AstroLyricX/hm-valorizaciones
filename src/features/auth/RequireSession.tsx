import { Navigate, Outlet, useLocation } from "react-router";

import { useSession } from "./useSession";

export function RequireSession() {
	const { user } = useSession();
	const location = useLocation();

	if (!user) {
		return <Navigate to="/login" replace state={{ from: location.pathname }} />;
	}

	return <Outlet />;
}
