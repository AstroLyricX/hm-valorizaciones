import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { routes } from "../../src/app/routes";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import type { Rol, SessionUser } from "../../src/features/auth/SessionContext";
import { SessionProvider } from "../../src/features/auth/SessionProvider";

export const DEMO_SESSION: SessionUser = { name: "Ana Quispe", email: "ana@hm.pe", rol: "ADMIN" };

// Sin rol, como las sesiones guardadas antes de los roles.
export function signInAs(user: Omit<SessionUser, "rol"> & { rol?: Rol } = DEMO_SESSION): void {
	localStorage.setItem("hm.session", JSON.stringify(user));
}

export function renderRoute(path: string) {
	const router = createMemoryRouter(routes, { initialEntries: [path] });

	render(
		<SessionProvider>
			<TooltipProvider>
				<RouterProvider router={router} />
				<Toaster />
			</TooltipProvider>
		</SessionProvider>,
	);

	return router;
}
