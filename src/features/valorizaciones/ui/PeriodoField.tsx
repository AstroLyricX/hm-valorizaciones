import type { CampoProps } from "@/shared/components/FormField";
import { SelectField } from "@/shared/components/SelectField";

import { ajustarPeriodo, nombreMes } from "../domain/valorizacion";

const MESES = Array.from({ length: 12 }, (_, indice) => {
	const nombre = nombreMes(indice + 1);

	return {
		value: String(indice + 1).padStart(2, "0"),
		label: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`,
	};
});

// Periodo "YYYY-MM" con dos selectores: mes y año (del año pasado al siguiente).
// Con desde/hasta ("YYYY-MM"), los meses y años fuera de ese rango no se pueden elegir.
export function PeriodoField({
	value,
	onChange,
	desde,
	hasta,
	...campo
}: Partial<CampoProps> & {
	value: string;
	onChange: (value: string) => void;
	desde?: string;
	hasta?: string;
}) {
	const [anio = "", mes = ""] = value.split("-");
	const actual = new Date().getFullYear();
	const fuera = (periodo: string) =>
		(desde !== undefined && periodo < desde) || (hasta !== undefined && periodo > hasta);
	const anios = [actual - 1, actual, actual + 1].map((opcion) => ({
		value: String(opcion),
		label: String(opcion),
		disabled: !cruza(opcion, desde, hasta),
	}));
	const meses = MESES.map((opcion) => ({
		...opcion,
		disabled: fuera(`${anio || actual}-${opcion.value}`),
	}));

	return (
		<div className="grid grid-cols-[1fr_7rem] gap-2">
			<SelectField
				{...campo}
				value={mes}
				onChange={(nuevo) => onChange(`${anio || actual}-${nuevo}`)}
				options={meses}
				placeholder="Seleccionar mes"
			/>
			<SelectField
				aria-label="Año del periodo"
				value={anio}
				onChange={(nuevo) => onChange(ajustarPeriodo(`${nuevo}-${mes || "01"}`, desde, hasta))}
				options={anios}
				placeholder="Año"
			/>
		</div>
	);
}

// Un año está dentro del rango si alguno de sus meses lo está.
function cruza(anio: number, desde?: string, hasta?: string): boolean {
	return (
		(desde === undefined || `${anio}-12` >= desde) && (hasta === undefined || `${anio}-01` <= hasta)
	);
}
