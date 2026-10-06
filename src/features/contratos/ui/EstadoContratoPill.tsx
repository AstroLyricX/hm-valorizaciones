import { Pill } from "@/shared/components/Pill";

import { type EstadoContrato, ETIQUETA_ESTADO_CONTRATO } from "../domain/contrato";

export function EstadoContratoPill({ estado }: { estado: EstadoContrato }) {
	return (
		<Pill tone={estado === "ACTIVO" ? "success" : "danger"} dot>
			{ETIQUETA_ESTADO_CONTRATO[estado]}
		</Pill>
	);
}
