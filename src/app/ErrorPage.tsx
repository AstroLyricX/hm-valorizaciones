import { RotateCcw, TriangleAlert } from "lucide-react";
import { Link, useRouteError } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Pantalla para errores inesperados: en vez de la página técnica de React Router, un mensaje
// claro y cómo seguir. Los datos guardados en el equipo no se pierden.
export function ErrorPage() {
	const error = useRouteError();
	const detalle = error instanceof Error ? error.message : String(error);

	return (
		<main className="flex min-h-svh items-center justify-center bg-canvas px-4 py-12">
			<div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-sm">
				<span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
					<TriangleAlert className="size-6" aria-hidden="true" />
				</span>
				<div className="flex flex-col gap-2">
					<h1 className="text-xl font-semibold text-navy-900">Algo salió mal</h1>
					<p className="text-sm text-muted-foreground">
						Ocurrió un error inesperado en esta pantalla. Tus datos siguen guardados en este equipo.
					</p>
				</div>
				<div className="flex flex-wrap justify-center gap-2">
					<Button className="h-10 px-4" onClick={() => window.location.reload()}>
						<RotateCcw />
						Recargar
					</Button>
					<Link to="/" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
						Volver al inicio
					</Link>
				</div>
				<details className="w-full text-left text-xs text-navy-400">
					<summary className="cursor-pointer">Detalle técnico</summary>
					<p className="mt-2 break-words">{detalle}</p>
				</details>
			</div>
		</main>
	);
}
