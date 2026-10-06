import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/shared/components/FormField";

import {
	type Valorizacion,
	type ValorizacionCabecera,
	ValorizacionCabeceraSchema,
} from "../domain/valorizacion";

interface Formulario {
	nombreServicio: string;
	plazoPago: string;
	gastosGeneralesPct: string;
	utilidadPct: string;
	observaciones: string;
}

function aFormulario(valorizacion: Valorizacion): Formulario {
	return {
		nombreServicio: valorizacion.nombreServicio,
		plazoPago: valorizacion.plazoPago,
		gastosGeneralesPct: String(valorizacion.gastosGeneralesPct),
		utilidadPct: String(valorizacion.utilidadPct),
		observaciones: valorizacion.observaciones,
	};
}

// Un porcentaje vacío cuenta como 0; un texto inválido falla la validación.
function aNumero(valor: string): number {
	return valor.trim() === "" ? 0 : Number(valor.replace(",", "."));
}

// Datos del servicio que se pueden ajustar en el borrador. Cada cambio válido se guarda solo.
export function DatosServicio({
	valorizacion,
	editable,
	onCambio,
}: {
	valorizacion: Valorizacion;
	editable: boolean;
	onCambio: (cabecera: ValorizacionCabecera) => void;
}) {
	const [formulario, setFormulario] = useState(() => aFormulario(valorizacion));
	const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({});

	const cambiar = (campo: keyof Formulario, valor: string) => {
		const siguiente = { ...formulario, [campo]: valor };
		setFormulario(siguiente);
		const resultado = ValorizacionCabeceraSchema.safeParse({
			...siguiente,
			gastosGeneralesPct: aNumero(siguiente.gastosGeneralesPct),
			utilidadPct: aNumero(siguiente.utilidadPct),
		});
		if (resultado.success) {
			setErrores({});
			onCambio(resultado.data);

			return;
		}
		setErrores(
			Object.fromEntries(
				resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
			),
		);
	};

	return (
		<div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
			<FormField
				label="Nombre del servicio"
				required
				error={errores.nombreServicio}
				className="sm:col-span-2"
			>
				{(campo) => (
					<Input
						{...campo}
						value={formulario.nombreServicio}
						disabled={!editable}
						onChange={(event) => cambiar("nombreServicio", event.target.value)}
						placeholder="Ingresar nombre del servicio"
						className="uppercase placeholder:normal-case"
					/>
				)}
			</FormField>
			<FormField label="Plazo de pago" error={errores.plazoPago}>
				{(campo) => (
					<Input
						{...campo}
						value={formulario.plazoPago}
						disabled={!editable}
						onChange={(event) => cambiar("plazoPago", event.target.value)}
						placeholder="Ingresar plazo, por ejemplo 30 días"
					/>
				)}
			</FormField>
			<FormField label="Gastos generales (%)" error={errores.gastosGeneralesPct}>
				{(campo) => (
					<Input
						{...campo}
						value={formulario.gastosGeneralesPct}
						disabled={!editable}
						inputMode="decimal"
						onChange={(event) => cambiar("gastosGeneralesPct", event.target.value)}
						placeholder="0"
						className="text-right tabular-nums"
					/>
				)}
			</FormField>
			<FormField label="Utilidad (%)" error={errores.utilidadPct}>
				{(campo) => (
					<Input
						{...campo}
						value={formulario.utilidadPct}
						disabled={!editable}
						inputMode="decimal"
						onChange={(event) => cambiar("utilidadPct", event.target.value)}
						placeholder="0"
						className="text-right tabular-nums"
					/>
				)}
			</FormField>
			<FormField label="Observaciones" error={errores.observaciones} className="sm:col-span-3">
				{(campo) => (
					<Textarea
						{...campo}
						value={formulario.observaciones}
						disabled={!editable}
						onChange={(event) => cambiar("observaciones", event.target.value)}
						placeholder="Ingresar observaciones"
						rows={2}
					/>
				)}
			</FormField>
		</div>
	);
}
