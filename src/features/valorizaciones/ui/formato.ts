import { nombreEquipo } from "@/features/equipos/domain/equipo";

import type { FilaPlanilla } from "../application/ValorizacionService";

const formatoHoras = new Intl.NumberFormat("es-PE", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function horas(valor: string): string {
	return formatoHoras.format(Number(valor));
}

// Descripción del servicio como en la planilla del xlsm: "EXCAVADORA CAT 340 - ALQUILER".
export function descripcionFila(fila: FilaPlanilla): string {
	return fila.equipo ? `${nombreEquipo(fila.equipo)} - ALQUILER` : "Equipo no encontrado";
}
