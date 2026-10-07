import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { hoyIso } from "@/features/contratos/domain/contrato";
import { equipoRepository } from "@/features/equipos/application/equipoService.instance";
import { valorizacionRepository } from "@/features/valorizaciones/application/valorizacionService.instance";

import type { DatosExportacion } from "../domain/libroExcel";

// Todos los registros vigentes del dispositivo, para el respaldo en Excel.
export async function datosExportacion(): Promise<DatosExportacion> {
	const [terceros, equipos, contratos, contratoEquipos, valorizaciones, valorizacionItems] =
		await Promise.all([
			terceroRepository.listar(),
			equipoRepository.listar(),
			contratoRepository.listar(),
			contratoRepository.todosLosEquipos(),
			valorizacionRepository.listar(),
			valorizacionRepository.todosLosItems(),
		]);

	return {
		terceros,
		equipos,
		contratos,
		contratoEquipos,
		valorizaciones,
		valorizacionItems,
		hoy: hoyIso(),
	};
}

export function nombreArchivoExcel(hoy: string): string {
	return `HM-valorizaciones-${hoy}.xlsx`;
}
