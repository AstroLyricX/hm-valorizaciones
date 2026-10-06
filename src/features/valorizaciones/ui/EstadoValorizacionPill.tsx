import { Pill, type PillTone } from "@/shared/components/Pill";

import { type EstadoValorizacion, ETIQUETA_ESTADO_VALORIZACION } from "../domain/valorizacion";

const TONO: Record<EstadoValorizacion, PillTone> = {
	BORRADOR: "warning",
	EMITIDA: "success",
	ANULADA: "neutral",
};

export function EstadoValorizacionPill({ estado }: { estado: EstadoValorizacion }) {
	return (
		<Pill tone={TONO[estado]} dot>
			{ETIQUETA_ESTADO_VALORIZACION[estado]}
		</Pill>
	);
}
