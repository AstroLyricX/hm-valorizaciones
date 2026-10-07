import { utils, write } from "xlsx";

import type { Hoja } from "../domain/libroExcel";

const FORMATO_NUMERO = "#,##0.00";
const FORMATO_FECHA = "dd/mm/yyyy";

// Se importa con import() al exportar: SheetJS no entra en la carga inicial de la app.
export function escribirExcel(hojas: readonly Hoja[]): ArrayBuffer {
	const libro = utils.book_new();

	for (const { nombre, columnas, numericas, filas } of hojas) {
		const hojaExcel = utils.json_to_sheet(filas, { header: columnas, UTC: true, cellDates: true });
		const rango = utils.decode_range(hojaExcel["!ref"] ?? "A1");

		for (let fila = rango.s.r + 1; fila <= rango.e.r; fila++) {
			columnas.forEach((columna, indice) => {
				const celda = hojaExcel[utils.encode_cell({ r: fila, c: indice })] as
					{ t: string; z?: string } | undefined;
				if (celda?.t === "d") {
					celda.z = FORMATO_FECHA;
				} else if (celda?.t === "n" && numericas.includes(columna)) {
					celda.z = FORMATO_NUMERO;
				}
			});
		}
		// Ancho de columna según el texto más largo (entre 10 y 50 caracteres).
		hojaExcel["!cols"] = columnas.map((columna) => ({
			wch: Math.min(
				50,
				Math.max(
					10,
					columna.length + 2,
					...filas.map((registro) => String(registro[columna] ?? "").length + 2),
				),
			),
		}));
		utils.book_append_sheet(libro, hojaExcel, nombre);
	}

	return write(libro, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
}
