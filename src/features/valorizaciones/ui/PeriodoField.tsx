import type { CampoProps } from "@/shared/components/FormField";
import { SelectField } from "@/shared/components/SelectField";

import { nombreMes } from "../domain/valorizacion";

const MESES = Array.from({ length: 12 }, (_, indice) => {
	const nombre = nombreMes(indice + 1);

	return {
		value: String(indice + 1).padStart(2, "0"),
		label: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`,
	};
});

// Periodo "YYYY-MM" con dos selectores: mes y año (del año pasado al siguiente).
export function PeriodoField({
	value,
	onChange,
	...campo
}: Partial<CampoProps> & { value: string; onChange: (value: string) => void }) {
	const [anio = "", mes = ""] = value.split("-");
	const actual = new Date().getFullYear();
	const anios = [actual - 1, actual, actual + 1].map((opcion) => ({
		value: String(opcion),
		label: String(opcion),
	}));

	return (
		<div className="grid grid-cols-[1fr_7rem] gap-2">
			<SelectField
				{...campo}
				value={mes}
				onChange={(nuevo) => onChange(`${anio || actual}-${nuevo}`)}
				options={MESES}
				placeholder="Seleccionar mes"
			/>
			<SelectField
				aria-label="Año del periodo"
				value={anio}
				onChange={(nuevo) => onChange(`${nuevo}-${mes || "01"}`)}
				options={anios}
				placeholder="Año"
			/>
		</div>
	);
}
