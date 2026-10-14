import { Pill } from "@/shared/components/Pill";

import { ETIQUETA_TIPO_CONTRATO, type TipoContrato } from "../domain/contrato";

// Emitido (H&M cobra) en azul; recibido (H&M paga) en índigo.
export function TipoContratoPill({ tipo }: { tipo: TipoContrato }) {
	return <Pill tone={tipo === "EMITIDO" ? "brand" : "indigo"}>{ETIQUETA_TIPO_CONTRATO[tipo]}</Pill>;
}
