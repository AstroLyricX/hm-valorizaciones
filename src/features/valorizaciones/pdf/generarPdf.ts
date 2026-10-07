import { type DocumentProps, Font, pdf } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import type { DatosPdf } from "./datosPdf";
import { ValorizacionPDF } from "./ValorizacionPDF";

// Sin guiones de separación: "ACUMULADO" no debe partirse en dos líneas.
Font.registerHyphenationCallback((palabra) => [palabra]);

// Se importa con import() al pulsar el botón: la librería de PDF no entra en la carga inicial.
export async function generarPdf(datos: DatosPdf): Promise<Blob> {
	// ValorizacionPDF devuelve un <Document>; pdf() solo acepta ese tipo de elemento.
	const documento = createElement(ValorizacionPDF, datos) as unknown as ReactElement<DocumentProps>;

	return pdf(documento).toBlob();
}
