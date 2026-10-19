import { Bell, BellRing, CircleAlert, Info } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useAvisos } from "./useAvisos";

// Campana de la barra superior con los avisos del día y su contador de no leídos.
export function AvisosButton() {
	const { avisos, noLeidos, marcarLeidos, permiso, activarNotificaciones } = useAvisos();
	const pendientes = noLeidos.length;
	const noLeido = new Set(noLeidos.map((aviso) => aviso.id));

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative text-navy-500"
						aria-label={pendientes > 0 ? `Avisos, ${pendientes} sin leer` : "Avisos"}
					/>
				}
			>
				<Bell />
				{pendientes > 0 && (
					<span
						aria-hidden="true"
						className="absolute -top-0.5 -right-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4.5 font-semibold text-white tabular-nums"
					>
						{pendientes > 9 ? "9+" : pendientes}
					</span>
				)}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
				<div className="flex items-center justify-between gap-2 border-b border-navy-100 px-3.5 py-2.5">
					<span className="font-semibold text-navy-900">Avisos</span>
					{pendientes > 0 && (
						<button
							type="button"
							onClick={() => marcarLeidos(noLeidos.map((aviso) => aviso.id))}
							className="text-xs font-medium text-brand-700 hover:underline"
						>
							Marcar como leídos
						</button>
					)}
				</div>
				{avisos !== undefined && avisos.length === 0 ? (
					<p className="px-3.5 py-6 text-center text-sm text-muted-foreground">Sin avisos.</p>
				) : (
					<ul
						aria-label="Lista de avisos"
						className="max-h-96 divide-y divide-navy-100 overflow-y-auto"
					>
						{(avisos ?? []).map((aviso) => {
							const Icono = aviso.nivel === "alerta" ? CircleAlert : Info;

							return (
								<li key={aviso.id}>
									<Link
										to={aviso.ruta}
										onClick={() => marcarLeidos([aviso.id])}
										className={cn(
											"flex gap-2.5 px-3.5 py-2.5 hover:bg-navy-50/70",
											noLeido.has(aviso.id) && "bg-brand-50/40",
										)}
									>
										<Icono
											aria-hidden="true"
											className={cn(
												"mt-0.5 size-4 shrink-0",
												aviso.nivel === "alerta" ? "text-amber-600" : "text-brand-600",
											)}
										/>
										<span className="flex min-w-0 flex-col">
											<span
												className={cn(
													"truncate text-sm text-navy-900",
													noLeido.has(aviso.id) && "font-semibold",
												)}
											>
												{aviso.titulo}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{aviso.detalle}
											</span>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
				{permiso === "default" && (
					<button
						type="button"
						onClick={() => void activarNotificaciones()}
						className="flex w-full items-center justify-center gap-2 border-t border-navy-100 px-3.5 py-2.5 text-sm font-medium text-brand-700 hover:bg-navy-50/70"
					>
						<BellRing className="size-4" aria-hidden="true" />
						Activar notificaciones
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}
