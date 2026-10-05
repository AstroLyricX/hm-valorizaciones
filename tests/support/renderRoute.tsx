import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { routes } from "../../src/app/routes";
import { TooltipProvider } from "../../src/components/ui/tooltip";
import { SessionProvider } from "../../src/features/auth/SessionProvider";

export const DEMO_SESSION = { name: "Ana Quispe", email: "ana@hm.pe" };

export function signInAs(user = DEMO_SESSION): void {
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
