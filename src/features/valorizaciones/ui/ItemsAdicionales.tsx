import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatearMoneda, formatearMonto, type Moneda } from "@/lib/dinero";
import { cn } from "@/lib/utils";
import { SelectField } from "@/shared/components/SelectField";

import {
	ABREVIATURA_UNIDAD,
	ETIQUETA_UNIDAD,
	type ItemAdicional,
	MAX_ADICIONALES,
	precioAdicional,
	UNIDADES_MEDIDA,
} from "../domain/valorizacion";
import { type ErroresAdicional, nuevoAdicional } from "./adicionales";
import { horas } from "./formato";

const OPCIONES_UNIDAD = UNIDADES_MEDIDA.map((unidad) => ({
	value: unidad,
	label: ETIQUETA_UNIDAD[unidad],
}));

const celda = "border border-navy-100 px-1.5 py-2";
const numero = "text-right tabular-nums whitespace-nowrap";
const entrada =
	"h-9 w-full rounded-md border border-brand-500/40 bg-brand-50/60 px-2 text-sm text-navy-900 outline-none focus-visible:border-ring focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:bg-red-50";

function cantidadMostrada(item: ItemAdicional): string {
	return /^\d{1,7}(\.\d{1,2})?$/.test(item.cantidad.trim()) ? item.cantidad.trim() : "0";
}

export interface PropsAdicionales {
	adicionales: readonly ItemAdicional[];
	// Importe de cada adicional, en el mismo orden.
	importes: readonly number[];
	// Número del primer adicional: van después de los equipos del contrato.
	desde: number;
	editable: boolean;
	errores: Readonly<Record<string, ErroresAdicional>>;
	onCambiar: (adicionales: ItemAdicional[]) => void;
}

function useEdicion({
	adicionales,
	onCambiar,
}: Pick<PropsAdicionales, "adicionales" | "onCambiar">) {
	return {
		cambiar: (id: string, cambios: Partial<ItemAdicional>) => {
			onCambiar(adicionales.map((item) => (item.id === id ? { ...item, ...cambios } : item)));
		},
		quitar: (id: string) => {
			onCambiar(adicionales.filter((item) => item.id !== id));
		},
	};
}

function Entrada({
	etiqueta,
	valor,
	error,
	onCambiar,
	decimal = false,
	className,
}: {
	etiqueta: string;
	valor: string;
	error: string | undefined;
	onCambiar: (valor: string) => void;
	decimal?: boolean;
	className?: string;
}) {
	return (
		<div className="flex flex-col gap-1">
			<input
				aria-label={etiqueta}
				aria-invalid={error !== undefined}
				inputMode={decimal ? "decimal" : undefined}
				value={valor}
				onFocus={decimal ? (event) => event.target.select() : undefined}
				onChange={(event) =>
					onCambiar(
						decimal ? event.target.value.replace(",", ".") : event.target.value.toUpperCase(),
					)
				}
				className={cn(entrada, decimal && "text-right font-semibold tabular-nums", className)}
			/>
			{error && <span className="text-xs text-destructive">{error}</span>}
		</div>
	);
}

// Filas de la tabla (pantalla grande), después de los equipos del contrato.
export function FilasAdicionales(props: PropsAdicionales) {
	const { adicionales, importes, desde, editable, errores } = props;
	const { cambiar, quitar } = useEdicion(props);

	return adicionales.map((item, indice) => {
		const numeroItem = desde + indice;
		const error = errores[item.id] ?? {};

		return (
			<tr key={item.id} className="align-top">
				<td className={cn(celda, "text-center")}>{numeroItem}</td>
				<td className={cn(celda, "font-medium text-navy-900")}>
					{editable ? (
						<div className="flex items-start gap-1">
							<Entrada
								etiqueta={`Descripción del ítem ${numeroItem}`}
								valor={item.descripcion}
								error={error.descripcion}
								onCambiar={(descripcion) => cambiar(item.id, { descripcion })}
								className="min-w-56"
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Quitar el ítem ${numeroItem}`}
								className="mt-0.5 text-navy-400 hover:text-red-600"
								onClick={() => quitar(item.id)}
							>
								<Trash2 />
							</Button>
						</div>
					) : (
						item.descripcion
					)}
				</td>
				<td className={cn(celda, "text-center")}>
					{editable ? (
						<SelectField
							aria-label={`Unidad de medida del ítem ${numeroItem}`}
							value={item.unidad}
							onChange={(unidad) => cambiar(item.id, { unidad: unidad as ItemAdicional["unidad"] })}
							options={OPCIONES_UNIDAD}
							className="data-[size=default]:h-9 min-w-24 px-2"
						/>
					) : (
						ABREVIATURA_UNIDAD[item.unidad]
					)}
				</td>
				<td className={cn(celda, numero, "text-navy-300")}>—</td>
				<td className={cn(celda, numero, editable && "p-1.5")}>
					{editable ? (
						<Entrada
							etiqueta={`Precio unitario del ítem ${numeroItem}`}
							valor={item.precioUnitario}
							error={error.precioUnitario}
							onCambiar={(precioUnitario) => cambiar(item.id, { precioUnitario })}
							decimal
							className="min-w-24"
						/>
					) : (
						formatearMonto(precioAdicional(item))
					)}
				</td>
				<td className={cn(celda, numero, "text-navy-300")}>—</td>
				<td className={cn(celda, numero, "text-navy-300")}>—</td>
				<td className={cn(celda, "bg-brand-50/50 p-1.5", !editable && numero)}>
					{editable ? (
						<Entrada
							etiqueta={`Cantidad del ítem ${numeroItem}`}
							valor={item.cantidad}
							error={error.cantidad}
							onCambiar={(cantidad) => cambiar(item.id, { cantidad })}
							decimal
							className="min-w-20"
						/>
					) : (
						horas(cantidadMostrada(item))
					)}
				</td>
				<td className={cn(celda, numero)}>{horas(cantidadMostrada(item))}</td>
				<td className={cn(celda, numero, "text-navy-300")}>—</td>
				<td className={cn(celda, numero, "bg-brand-50/50 font-medium text-navy-900")}>
					{formatearMonto(importes[indice] ?? 0)}
				</td>
				<td className={cn(celda, numero)}>{formatearMonto(importes[indice] ?? 0)}</td>
			</tr>
		);
	});
}

// Tarjetas para celular.
export function TarjetasAdicionales(props: PropsAdicionales & { moneda: Moneda }) {
	const { adicionales, importes, desde, editable, errores, moneda } = props;
	const { cambiar, quitar } = useEdicion(props);

	return adicionales.map((item, indice) => {
		const numeroItem = desde + indice;
		const error = errores[item.id] ?? {};

		return (
			<li key={item.id} className="flex flex-col gap-3 px-4 py-4">
				{editable ? (
					<>
						<div className="flex items-start gap-1">
							<span className="mt-2 text-sm font-medium text-navy-900">{numeroItem}.</span>
							<Entrada
								etiqueta={`Descripción del ítem ${numeroItem}`}
								valor={item.descripcion}
								error={error.descripcion}
								onCambiar={(descripcion) => cambiar(item.id, { descripcion })}
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Quitar el ítem ${numeroItem}`}
								className="mt-0.5 text-navy-400 hover:text-red-600"
								onClick={() => quitar(item.id)}
							>
								<Trash2 />
							</Button>
						</div>
						<div className="grid grid-cols-3 gap-2 text-[13px]">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">Unidad</span>
								<SelectField
									aria-label={`Unidad de medida del ítem ${numeroItem}`}
									value={item.unidad}
									onChange={(unidad) =>
										cambiar(item.id, { unidad: unidad as ItemAdicional["unidad"] })
									}
									options={OPCIONES_UNIDAD}
									className="data-[size=default]:h-9 px-2"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="font-medium text-brand-700">Cantidad</span>
								<Entrada
									etiqueta={`Cantidad del ítem ${numeroItem}`}
									valor={item.cantidad}
									error={error.cantidad}
									onCambiar={(cantidad) => cambiar(item.id, { cantidad })}
									decimal
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground">P.U.</span>
								<Entrada
									etiqueta={`Precio unitario del ítem ${numeroItem}`}
									valor={item.precioUnitario}
									error={error.precioUnitario}
									onCambiar={(precioUnitario) => cambiar(item.id, { precioUnitario })}
									decimal
								/>
							</div>
						</div>
					</>
				) : (
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-navy-900">
							{numeroItem}. {item.descripcion}
						</span>
						<span className="text-[13px] text-muted-foreground tabular-nums">
							{horas(cantidadMostrada(item))} {ABREVIATURA_UNIDAD[item.unidad]} ×{" "}
							{formatearMoneda(precioAdicional(item), moneda)}
						</span>
					</div>
				)}
				<span className="flex justify-between text-[13px]">
					<span className="text-muted-foreground">Importe del periodo</span>
					<span className="font-semibold text-navy-900 tabular-nums">
						{formatearMoneda(importes[indice] ?? 0, moneda)}
					</span>
				</span>
			</li>
		);
	});
}

export function AgregarAdicional({
	adicionales,
	onCambiar,
	className,
}: Pick<PropsAdicionales, "adicionales" | "onCambiar"> & { className?: string }) {
	if (adicionales.length >= MAX_ADICIONALES) {
		return null;
	}

	return (
		<Button
			variant="outline"
			className={cn("h-9 w-fit px-3.5", className)}
			onClick={() => onCambiar([...adicionales, nuevoAdicional()])}
		>
			<Plus />
			Agregar ítem
		</Button>
	);
}
