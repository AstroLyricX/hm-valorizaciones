import { CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ResultadoRuc } from "../application/RucService";

export type EstadoConsulta = { tipo: "inicial" } | { tipo: "buscando" } | ResultadoRuc;

// Mensaje bajo el RUC con el resultado de la consulta a SUNAT.
export function EstadoConsultaRuc({ estado }: { estado: EstadoConsulta }) {
	if (estado.tipo === "inicial" || estado.tipo === "invalido") {
		return null;
	}

	const contenido = (() => {
		switch (estado.tipo) {
			case "buscando":
				return { icono: LoaderCircle, tono: "text-navy-500", texto: "Consultando SUNAT…" };
			case "no-encontrado":
				return {
					icono: Info,
					tono: "text-amber-700",
					texto: "El RUC no figura en SUNAT. Completa los datos a mano.",
				};
			case "no-disponible":
				return {
					icono: Info,
					tono: "text-navy-500",
					texto: "No se pudo consultar SUNAT ahora. Completa los datos a mano.",
				};
			case "encontrado": {
				const { estado: situacion, condicion } = estado.datos;
				const enRegla = situacion === "ACTIVO" && condicion === "HABIDO";

				return enRegla
					? {
							icono: CircleCheck,
							tono: "text-emerald-700",
							texto: `Datos de SUNAT: ${situacion} · ${condicion}.`,
						}
					: {
							icono: TriangleAlert,
							tono: "text-amber-700",
							texto: `Atención: en SUNAT figura ${situacion || "sin estado"} · ${condicion || "sin condición"}.`,
						};
			}
		}
	})();
	const { icono: Icono, tono, texto } = contenido;

	return (
		<p role="status" className={cn("flex items-center gap-1.5 text-xs font-medium", tono)}>
			<Icono
				className={cn("size-3.5 shrink-0", estado.tipo === "buscando" && "animate-spin")}
				aria-hidden="true"
			/>
			{texto}
		</p>
	);
}
