import {
	CircleAlert,
	CloudCheck,
	CloudOff,
	CloudUpload,
	KeyRound,
	LoaderCircle,
	type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ConnectionStatus } from "@/shared/components/ConnectionStatus";

import { type EstadoSync, useSincronizacion } from "./SyncContext";

function cambios(cantidad: number): string {
	return cantidad === 1 ? "1 cambio" : `${cantidad} cambios`;
}

const ESTILO: Record<Exclude<EstadoSync, "desactivada">, { icono: LucideIcon; tono: string }> = {
	"sin-conexion": { icono: CloudOff, tono: "border-amber-200/70 bg-amber-50 text-amber-800" },
	sincronizando: { icono: LoaderCircle, tono: "border-brand-100 bg-brand-50 text-brand-700" },
	"al-dia": { icono: CloudCheck, tono: "border-emerald-200/70 bg-emerald-50 text-emerald-700" },
	pendiente: { icono: CloudUpload, tono: "border-brand-100 bg-brand-50 text-brand-700" },
	reautenticar: { icono: KeyRound, tono: "border-amber-200/70 bg-amber-50 text-amber-800" },
	error: { icono: CircleAlert, tono: "border-red-200 bg-red-50 text-red-700" },
};

// Estado de la sincronización en la cabecera. Al tocarlo sincroniza ahora (o pide el login).
export function SyncStatus({ className }: { className?: string }) {
	const { estado, pendientes, sincronizar, reautenticar } = useSincronizacion();

	if (estado === "desactivada") {
		return <ConnectionStatus className={className} />;
	}

	const texto: Record<Exclude<EstadoSync, "desactivada">, string> = {
		"sin-conexion":
			pendientes > 0
				? `Sin conexión: ${cambios(pendientes)} guardados en este equipo`
				: "Sin conexión: los cambios se guardan en este equipo",
		sincronizando: "Sincronizando…",
		"al-dia": "Todo sincronizado",
		pendiente: `${cambios(pendientes)} por sincronizar`,
		reautenticar: "Inicia sesión de nuevo para sincronizar",
		error: "No se pudo sincronizar. Reintentar",
	};
	const { icono: Icono, tono } = ESTILO[estado];

	// Botón real (se puede tocar) dentro de una región que anuncia los cambios de estado.
	return (
		<span role="status" className="inline-flex">
			<button
				type="button"
				title={
					estado === "reautenticar" ? "Volver a iniciar sesión con Microsoft" : "Sincronizar ahora"
				}
				disabled={estado === "sincronizando" || estado === "sin-conexion"}
				onClick={() => void (estado === "reautenticar" ? reautenticar() : sincronizar())}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors enabled:hover:brightness-95 disabled:cursor-default",
					tono,
					className,
				)}
			>
				<Icono
					className={cn("size-3.5 shrink-0", estado === "sincronizando" && "animate-spin")}
					aria-hidden="true"
				/>
				{texto[estado]}
			</button>
		</span>
	);
}
