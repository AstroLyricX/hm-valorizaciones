import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { basename } from "@/app/entorno";
import { routes } from "@/app/routes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/features/auth/SessionProvider";

const router = createBrowserRouter(routes, { basename });

export function App() {
	return (
		<SessionProvider>
			<TooltipProvider>
				<RouterProvider router={router} />
				<Toaster position="top-center" richColors closeButton />
			</TooltipProvider>
		</SessionProvider>
	);
}
