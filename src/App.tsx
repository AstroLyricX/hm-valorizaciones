import { createBrowserRouter, RouterProvider } from "react-router";

import { routes } from "@/app/routes";
import { SessionProvider } from "@/features/auth/SessionProvider";

const router = createBrowserRouter(routes);

export function App() {
	return (
		<SessionProvider>
			<RouterProvider router={router} />
		</SessionProvider>
	);
}
