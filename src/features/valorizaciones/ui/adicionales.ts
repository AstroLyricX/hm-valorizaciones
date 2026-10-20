import { uuidv7 } from "uuidv7";

import { type ItemAdicional, ItemAdicionalCompletoSchema } from "../domain/valorizacion";

export type CampoAdicional = "descripcion" | "cantidad" | "precioUnitario";
export type ErroresAdicional = Partial<Record<CampoAdicional, string>>;

export function nuevoAdicional(): ItemAdicional {
	return { id: uuidv7(), descripcion: "", unidad: "HORAS", cantidad: "", precioUnitario: "" };
}

// Errores de cada fila, para mostrarlos al intentar emitir.
export function erroresAdicionales(
	adicionales: readonly ItemAdicional[],
): Record<string, ErroresAdicional> {
	return Object.fromEntries(
		adicionales.map((item) => {
			const resultado = ItemAdicionalCompletoSchema.safeParse(item);

			return [
				item.id,
				resultado.success
					? {}
					: Object.fromEntries(
							resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
						),
			];
		}),
	);
}
