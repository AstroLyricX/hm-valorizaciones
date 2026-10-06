import { type ColumnDef, type SortingState, useTable } from "@tanstack/react-table";
import { Plus, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SelectField } from "@/shared/components/SelectField";
import { type FiltroColumna, type TablaFeatures, tablaFeatures } from "@/shared/lib/tabla";

const ALINEACION = {
	izquierda: "text-left",
	centro: "text-center",
	derecha: "text-right",
} as const;
// Opción "Todos" del filtro: el selector no admite un valor vacío como opción.
const TODOS = "__todos__";
const celda = "border border-navy-100 px-2.5 py-2.5";

function FiltroCelda({
	filtro,
	titulo,
	valor,
	onChange,
}: {
	filtro: FiltroColumna;
	titulo: string;
	valor: string;
	onChange: (valor: string) => void;
}) {
	const clase =
		"h-8 w-full min-w-0 rounded-md border border-navy-100 bg-white px-2.5 text-[13px] font-normal text-navy-900 outline-none placeholder:text-navy-400 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

	return filtro.tipo === "texto" ? (
		<input
			type="search"
			value={valor}
			onChange={(event) => onChange(event.target.value)}
			placeholder={filtro.placeholder ?? titulo}
			aria-label={`Filtrar por ${titulo.toLowerCase()}`}
			className={cn(clase, "min-w-16")}
		/>
	) : (
		<SelectField
			value={valor === "" ? TODOS : valor}
			onChange={(nuevo) => onChange(nuevo === TODOS ? "" : nuevo)}
			options={[
				{ value: TODOS, label: "Todos" },
				...filtro.opciones.map((opcion) => ({ value: opcion.valor, label: opcion.etiqueta })),
			]}
			aria-label={`Filtrar por ${titulo.toLowerCase()}`}
			className={cn(
				"min-w-24 rounded-md bg-white px-2.5 text-[13px] font-normal data-[size=default]:h-8",
				valor === "" && "text-navy-400",
			)}
		/>
	);
}

// Tabla de listados: columna N.°, fila de filtros por columna, botón "Nuevo" en la columna
// de acciones y filas alternadas. Las columnas se definen con `crearColumnas`; el encabezado
// debe ser texto para usarlo como texto de ejemplo del filtro.
export function DataTable<TData extends { id: string }>({
	data,
	columns,
	initialSorting,
	nuevo,
	vacio,
	onRowClick,
}: {
	data: TData[];
	columns: ColumnDef<TablaFeatures, TData>[];
	initialSorting?: SortingState;
	// Botón de la cabecera de acciones.
	nuevo?: { label: string; onClick: () => void };
	// Mensaje cuando aún no hay registros.
	vacio: ReactNode;
	onRowClick?: (row: TData) => void;
}) {
	const table = useTable({
		features: tablaFeatures,
		columns,
		data,
		getRowId: (row) => row.id,
		initialState: { sorting: initialSorting ?? [] },
	});
	const columnas = table.getAllLeafColumns();
	const filas = table.getRowModel().rows;
	const hayFiltros = table.state.columnFilters.length > 0;

	return (
		<div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card">
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="bg-white">
							<th
								scope="col"
								className={cn(
									celda,
									"w-12 text-center font-semibold whitespace-nowrap text-navy-900",
								)}
							>
								N.°
							</th>
							{columnas.map((columna) => (
								<th
									key={columna.id}
									scope="col"
									className={cn(
										celda,
										"font-semibold text-navy-900",
										ALINEACION[columna.columnDef.meta?.alineacion ?? "centro"],
									)}
								>
									{typeof columna.columnDef.header === "string" ? columna.columnDef.header : null}
									{columna.id === "acciones" && "Acciones"}
								</th>
							))}
						</tr>
						<tr className="bg-white">
							<td className={celda} />
							{columnas.map((columna) => {
								const filtro = columna.columnDef.meta?.filtro;
								const titulo =
									typeof columna.columnDef.header === "string" ? columna.columnDef.header : "";

								return (
									<td key={columna.id} className={cn(celda, "py-2")}>
										{columna.id === "acciones" && nuevo ? (
											<Button type="button" className="h-8 w-full px-3" onClick={nuevo.onClick}>
												<Plus />
												{nuevo.label}
											</Button>
										) : filtro ? (
											<FiltroCelda
												filtro={filtro}
												titulo={titulo}
												valor={(columna.getFilterValue() as string | undefined) ?? ""}
												onChange={(valor) =>
													columna.setFilterValue(valor === "" ? undefined : valor)
												}
											/>
										) : null}
									</td>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{filas.length === 0 ? (
							<tr>
								<td colSpan={columnas.length + 1} className={cn(celda, "py-12 text-center")}>
									{hayFiltros ? (
										<div className="flex flex-col items-center gap-3 text-muted-foreground">
											<SearchX className="size-6 text-navy-300" aria-hidden="true" />
											<span>Ningún registro coincide con los filtros.</span>
											<Button
												variant="outline"
												className="h-8 px-3"
												onClick={() => table.resetColumnFilters()}
											>
												Limpiar filtros
											</Button>
										</div>
									) : (
										vacio
									)}
								</td>
							</tr>
						) : (
							filas.map((fila, index) => (
								<tr
									key={fila.id}
									className={cn(
										"text-navy-700 transition-colors",
										index % 2 === 0 ? "bg-navy-50/70" : "bg-white",
										onRowClick && "cursor-pointer hover:bg-brand-50/60",
									)}
									onClick={onRowClick ? () => onRowClick(fila.original) : undefined}
								>
									<td className={cn(celda, "text-center text-navy-500 tabular-nums")}>
										{index + 1}
									</td>
									{fila.getAllCells().map((cell) => (
										<td
											key={cell.id}
											className={cn(
												celda,
												ALINEACION[cell.column.columnDef.meta?.alineacion ?? "centro"],
												cell.column.columnDef.meta?.celda,
											)}
										>
											<table.FlexRender cell={cell} />
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			<p className="border-t border-navy-100 px-4 py-2.5 text-[13px] text-muted-foreground">
				{filas.length} de {data.length} {data.length === 1 ? "registro" : "registros"}
			</p>
		</div>
	);
}
