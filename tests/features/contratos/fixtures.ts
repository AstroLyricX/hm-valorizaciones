import type { ContratoDatos } from "../../../src/features/contratos/domain/contrato";

// Contrato del xlsm: excavadora CAT 340, 150 horas mínimas a USD 47.00 = USD 7,050.00.
export function equipoDelContrato(
	equipoId: string,
	cambios: Partial<ContratoDatos["equipos"][number]> = {},
): ContratoDatos["equipos"][number] {
	return { equipoId, horasMinimas: "150", costoHora: 4700, ...cambios };
}

export function contratoDatos(
	terceroId: string,
	equipoId: string,
	cambios: Partial<ContratoDatos> = {},
): ContratoDatos {
	return {
		tipo: "EMITIDO",
		terceroId,
		proyecto: "Gestión general de subcontratos - OSUR",
		ubicacion: "Asillo - San Antón",
		documentoContractual: "13.2025",
		fechaInicio: "2026-08-01",
		fechaFin: "2026-12-31",
		moneda: "USD",
		fondoGarantiaPct: 0,
		observaciones: "",
		equipos: [equipoDelContrato(equipoId)],
		...cambios,
	};
}

export { CLIENTE, excavadora, volquete } from "../../support/fixtures";
