import { useLiveQuery } from "dexie-react-hooks";

import { empresaRepository } from "./application/empresaService.instance";
import { EMPRESA_INICIAL } from "./domain/empresa";

// IGV de Configuración (18 % hasta que se guarde otro).
export function useIgvPorcentaje(): number {
	const empresa = useLiveQuery(() => empresaRepository.obtener());

	return empresa?.igvPorcentaje ?? EMPRESA_INICIAL.igvPorcentaje;
}
