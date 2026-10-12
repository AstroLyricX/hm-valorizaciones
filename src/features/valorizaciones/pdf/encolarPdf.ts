import { ruta } from "@/app/entorno";
import { db } from "@/data/db";
import { rutaPdf } from "@/data/sync/syncEngine";
import { ahoraIso } from "@/lib/fechas";

import { calcularPlanilla } from "../application/ValorizacionService";
import { valorizacionService } from "../application/valorizacionService.instance";
import { nombreArchivoPdf } from "./datosPdf";

// Genera el PDF de una valorización recién emitida y lo deja en cola para subirlo a SharePoint
// (SistemaHM/pdf/{año}/). Funciona sin conexión: se sube en la próxima sincronización.
export async function encolarPdf(valorizacionId: string): Promise<void> {
	const planilla = await valorizacionService.obtenerPlanilla(valorizacionId);
	const fechaEmision = planilla?.valorizacion.fechaEmision;
	if (!planilla || !fechaEmision) {
		return;
	}
	const { generarPdf } = await import("./generarPdf");
	const archivo = await generarPdf({
		planilla,
		calculo: calcularPlanilla(planilla),
		logo: ruta("logo-hm.png"),
	});
	await db.archivosPendientes.add({
		ruta: rutaPdf(nombreArchivoPdf(planilla), fechaEmision),
		archivo,
		valorizacionId,
		createdAt: ahoraIso(),
	});
}
