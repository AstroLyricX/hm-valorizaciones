import { TriangleAlert } from "lucide-react";

import { formatearMoneda, formatearMonto, type Moneda } from "@/lib/dinero";
import { cn } from "@/lib/utils";

import type { FilaPlanilla } from "../application/ValorizacionService";
import type { ColumnaResumen, ValorizacionCalculada } from "../domain/valorizacion";
import { horas } from "./formato";

const celda = "border border-navy-100 px-1.5 py-2";
const numero = "text-right tabular-nums whitespace-nowrap";

interface PropsPlanilla {
	filas: readonly FilaPlanilla[];
	cantidades: Readonly<Record<string, string>>;
	errores: Readonly<Record<string, string | undefined>>;
	onCantidad: (contratoEquipoId: string, valor: string) => void;
	calculo: ValorizacionCalculada;
	moneda: Moneda;
	parametros: { gastosGeneralesPct: number; utilidadPct: number; igvPct: number };
	editable: boolean;
}

function CampoHoras({
	fila,
	indice,
	valor,
	error,
	onCantidad,
	editable,
	className,
}: {
	fila: FilaPlanilla;
	indice: number;
	valor: string;
	error: string | undefined;
	onCantidad: (contratoEquipoId: string, valor: string) => void;
	editable: boolean;
	className?: string;
}) {
	const idError = `error-horas-${fila.contratoEquipoId}`;

	return (
		<div className="flex flex-col gap-1">
			<input
				aria-label={`Horas del periodo del ítem ${indice + 1}`}
				aria-invalid={error !== undefined}
				aria-describedby={error ? idError : undefined}
				aria-required="true"
				inputMode="decimal"
				value={valor}
				disabled={!editable}
				onFocus={(event) => event.target.select()}
				onChange={(event) =>
					onCantidad(fila.contratoEquipoId, event.target.value.replace(",", "."))
				}
				className={cn(
					"h-9 w-full min-w-20 rounded-md border border-brand-500/40 bg-brand-50/60 px-2 text-right text-sm font-semibold text-navy-900 tabular-nums outline-none focus-visible:border-ring focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-ring/40 disabled:border-navy-100 disabled:bg-transparent aria-invalid:border-destructive aria-invalid:bg-red-50",
					className,
				)}
			/>
			{error && (
				<span id={idError} className="text-xs text-destructive">
					{error}
				</span>
			)}
		</div>
	);
}

function FilaResumen({
	etiqueta,
	campo,
	calculo,
	destacada = false,
}: {
	etiqueta: string;
	campo: keyof ColumnaResumen;
	calculo: ValorizacionCalculada;
	destacada?: boolean;
}) {
	const clase = cn(celda, numero, destacada && "font-semibold text-navy-900");

	return (
		<tr className={destacada ? "bg-navy-50" : undefined}>
			<td
				className={cn(celda, "text-right", destacada && "font-semibold text-navy-900")}
				colSpan={5}
			>
				{etiqueta}
			</td>
			<td className={clase}>{formatearMonto(calculo.contractual[campo])}</td>
			<td className={celda} colSpan={3} />
			<td className={clase}>{formatearMonto(calculo.anterior[campo])}</td>
			<td className={cn(clase, "bg-brand-50/50")}>{formatearMonto(calculo.actual[campo])}</td>
			<td className={clase}>{formatearMonto(calculo.acumulado[campo])}</td>
		</tr>
	);
}

function etiquetasResumen(parametros: PropsPlanilla["parametros"]) {
	return [
		{ etiqueta: "Subtotal 1", campo: "subtotal1" },
		{ etiqueta: `Gastos generales (${parametros.gastosGeneralesPct} %)`, campo: "gastosGenerales" },
		{ etiqueta: `Utilidad (${parametros.utilidadPct} %)`, campo: "utilidad" },
		{ etiqueta: "Subtotal 2", campo: "subtotal2" },
		{ etiqueta: `IGV ${parametros.igvPct} %`, campo: "igv" },
		{ etiqueta: "Total de la factura", campo: "total", destacada: true },
	] as const;
}

// Planilla de medición como en la hoja VALORIZACION: solo se escriben las horas del periodo.
export function PlanillaMedicion(props: PropsPlanilla) {
	const { filas, cantidades, errores, onCantidad, calculo, moneda, parametros, editable } = props;

	return (
		<>
			<div className="hidden overflow-x-auto md:block">
				<table className="w-full border-collapse text-[13px] text-navy-700">
					<thead className="bg-navy-50 text-xs font-semibold text-navy-800">
						<tr>
							<th rowSpan={2} className={cn(celda, "w-10 text-center")}>
								Ítem
							</th>
							<th rowSpan={2} className={cn(celda, "min-w-40 text-left")}>
								Descripción del servicio
							</th>
							<th rowSpan={2} className={cn(celda, "text-center")}>
								UM
							</th>
							<th colSpan={3} className={cn(celda, "text-center")}>
								Contractual ({moneda})
							</th>
							<th colSpan={3} className={cn(celda, "text-center")}>
								Cantidades (horas)
							</th>
							<th colSpan={3} className={cn(celda, "text-center")}>
								Importes ({moneda})
							</th>
						</tr>
						<tr>
							<th className={cn(celda, "text-right")}>Cant.</th>
							<th className={cn(celda, "text-right")}>P.U.</th>
							<th className={cn(celda, "text-right")}>Parcial</th>
							<th className={cn(celda, "text-right")}>Anterior</th>
							<th className={cn(celda, "w-24 bg-brand-50 text-center text-brand-700")}>
								Actual {editable && <span className="text-red-500">*</span>}
							</th>
							<th className={cn(celda, "text-right")}>Acumulado</th>
							<th className={cn(celda, "text-right")}>Anterior</th>
							<th className={cn(celda, "bg-brand-50 text-right text-brand-700")}>Actual</th>
							<th className={cn(celda, "text-right")}>Acumulado</th>
						</tr>
					</thead>
					<tbody>
						{filas.map((fila, indice) => {
							const item = calculo.items[indice];
							const excede = item.exceso !== "0";

							return (
								<tr key={fila.contratoEquipoId} className="align-top">
									<td className={cn(celda, "text-center")}>{indice + 1}</td>
									<td className={cn(celda, "font-medium text-navy-900")}>
										{fila.descripcion}
										{excede && (
											<span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
												<TriangleAlert className="size-3.5" aria-hidden="true" />
												Excede en {horas(item.exceso)} h
											</span>
										)}
									</td>
									<td className={cn(celda, "text-center")}>H</td>
									<td className={cn(celda, numero)}>{horas(fila.cantidadContractual)}</td>
									<td className={cn(celda, numero)}>{formatearMonto(fila.precioUnitario)}</td>
									<td className={cn(celda, numero)}>{formatearMonto(item.parcial)}</td>
									<td className={cn(celda, numero)}>{horas(fila.cantidadAnterior)}</td>
									<td className={cn(celda, "bg-brand-50/50 p-1.5")}>
										<CampoHoras
											fila={fila}
											indice={indice}
											valor={cantidades[fila.contratoEquipoId] ?? ""}
											error={errores[fila.contratoEquipoId]}
											onCantidad={onCantidad}
											editable={editable}
										/>
									</td>
									<td className={cn(celda, numero, excede && "font-semibold text-amber-700")}>
										{horas(item.cantidadAcumulada)}
									</td>
									<td className={cn(celda, numero)}>{formatearMonto(item.importeAnterior)}</td>
									<td className={cn(celda, numero, "bg-brand-50/50 font-medium text-navy-900")}>
										{formatearMonto(item.importeActual)}
									</td>
									<td className={cn(celda, numero)}>{formatearMonto(item.importeAcumulado)}</td>
								</tr>
							);
						})}
					</tbody>
					<tfoot>
						{etiquetasResumen(parametros).map((fila) => (
							<FilaResumen key={fila.campo} {...fila} calculo={calculo} />
						))}
					</tfoot>
				</table>
			</div>

			<div className="flex flex-col md:hidden">
				<ul className="divide-y divide-navy-100">
					{filas.map((fila, indice) => {
						const item = calculo.items[indice];
						const excede = item.exceso !== "0";

						return (
							<li key={fila.contratoEquipoId} className="flex flex-col gap-3 px-4 py-4">
								<div className="flex flex-col gap-0.5">
									<span className="font-medium text-navy-900">
										{indice + 1}. {fila.descripcion}
									</span>
									<span className="text-[13px] text-muted-foreground tabular-nums">
										{horas(fila.cantidadContractual)} h ×{" "}
										{formatearMoneda(fila.precioUnitario, moneda)}
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2 text-[13px] tabular-nums">
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Anterior</span>
										<span className="flex h-9 items-center">{horas(fila.cantidadAnterior)} h</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="font-medium text-brand-700">
											Actual {editable && <span className="text-red-500">*</span>}
										</span>
										<CampoHoras
											fila={fila}
											indice={indice}
											valor={cantidades[fila.contratoEquipoId] ?? ""}
											error={errores[fila.contratoEquipoId]}
											onCantidad={onCantidad}
											editable={editable}
										/>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Acumulado</span>
										<span
											className={cn(
												"flex h-9 items-center",
												excede && "font-semibold text-amber-700",
											)}
										>
											{horas(item.cantidadAcumulada)} h
										</span>
									</div>
								</div>
								{excede && (
									<span className="flex items-center gap-1 text-xs font-medium text-amber-700">
										<TriangleAlert className="size-3.5" aria-hidden="true" />
										Excede en {horas(item.exceso)} h
									</span>
								)}
								<span className="flex justify-between text-[13px]">
									<span className="text-muted-foreground">Importe del periodo</span>
									<span className="font-semibold text-navy-900 tabular-nums">
										{formatearMoneda(item.importeActual, moneda)}
									</span>
								</span>
							</li>
						);
					})}
				</ul>
				<dl className="flex flex-col gap-2 border-t border-navy-100 bg-navy-50/60 px-4 py-4 text-sm">
					{etiquetasResumen(parametros).map((fila) => (
						<div
							key={fila.campo}
							className={cn(
								"flex justify-between tabular-nums",
								"destacada" in fila && "border-t border-navy-200 pt-2 font-semibold text-navy-900",
							)}
						>
							<dt>{fila.etiqueta}</dt>
							<dd>{formatearMoneda(calculo.actual[fila.campo], moneda)}</dd>
						</div>
					))}
				</dl>
			</div>
		</>
	);
}
