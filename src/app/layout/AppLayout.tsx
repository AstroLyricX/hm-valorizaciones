import { Outlet, ScrollRestoration, useLocation } from "react-router";

import { ruta } from "@/app/entorno";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AvisosButton } from "@/features/avisos/ui/AvisosButton";
import { usePublicarAvisos } from "@/features/avisos/ui/usePublicarAvisos";
import { SyncStatus } from "@/features/sincronizacion/SyncStatus";
import { OfflineBanner } from "@/shared/components/OfflineBanner";

import { findNavItem, NUEVA_VALORIZACION_PATH } from "../navigation";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
	const { pathname } = useLocation();
	const isNuevaValorizacion = pathname === NUEVA_VALORIZACION_PATH;
	const seccion = findNavItem(pathname);
	const titulo = isNuevaValorizacion ? "Nueva valorización" : (seccion?.label ?? "");
	usePublicarAvisos();

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="min-w-0 bg-canvas dark:bg-background">
				<header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-navy-100 bg-white px-4 shadow-[0_1px_2px_rgb(14_30_54/0.04)] md:px-6 dark:bg-background">
					<SidebarTrigger className="-ml-2 hidden text-navy-500 md:inline-flex" />
					<img
						src={ruta("favicon.svg")}
						alt=""
						width={28}
						height={28}
						className="size-7 rounded-md md:hidden"
					/>
					{/* En celular el título va en la barra; en pantalla grande ya lo muestra la página. */}
					<span className="truncate font-semibold text-navy-900 md:hidden">{titulo}</span>
					<div className="ml-auto flex items-center gap-3">
						<SyncStatus className="max-md:hidden" />
						<AvisosButton />
					</div>
				</header>
				<OfflineBanner className="md:hidden" />

				<main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-12">
					<Outlet />
				</main>

				<MobileNav />
				{/* Cada página nueva se abre arriba; al volver atrás se recupera la posición. */}
				<ScrollRestoration />
			</SidebarInset>
		</SidebarProvider>
	);
}
