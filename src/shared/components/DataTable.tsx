import { type ColumnDef, type SortingState, useTable } from "@tanstack/react-table";
import { Search, SearchX } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SelectField } from "@/shared/components/SelectField";
import { type FiltroColumna, type TablaFeatures, tablaFeatures } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

const ALINEACION = {
	izquierda: "text-left",
	centro: "text-center",
	derecha: "text-right",
} as const;
// Opción "Todos" del filtro: el selector no admite un valor vacío como opción.
const TODOS = "__todos__";
const celda = "px-4 py-3.5";

function FiltroOpciones({
	filtro,
	titulo,
	valor,
	onChange,
}: {
	filtro: Extract<FiltroColumna, { tipo: "opciones" }>;
	titulo: string;
	valor: string;
	onChange: (valor: string) => void;
}) {
	return (
		<SelectField
			value={valor === "" ? TODOS : valor}
			onChange={(nuevo) => onChange(nuevo === TODOS ? "" : nuevo)}
			options={[
				{ value: TODOS, label: `${titulo}: todos` },
				...filtro.opciones.map((opcion) => ({ value: opcion.valor, label: opcion.etiqueta })),
			]}
			aria-label={`Filtrar por ${titulo.toLowerCase()}`}
			className={cn("min-w-40 bg-white md:w-auto", valor === "" && "text-navy-500")}
		/>
	);
}

// Tabla de listados para pantalla grande, con el mismo estilo limpio que la vista de celular:
// un buscador (sobre las columnas con filtro de texto), los filtros de opciones a su lado y filas
// separadas solo por una línea. Las columnas se definen con `crearColumnas`; el encabezado debe
// ser texto. La acción principal ("Agregar…") va en la cabecera de la página.
export function DataTable<TData extends { id: string }>({
	data,
	columns,
	initialSorting,
	buscar = "Buscar",
	vacio,
	onRowClick,
}: {
	data: TData[];
	columns: ColumnDef<TablaFeatures, TData>[];
	initialSorting?: SortingState;
	// Texto de ejemplo del buscador: "Buscar por razón social, RUC o código".
	buscar?: string;
	// Mensaje cuando aún no hay registros.
	vacio: ReactNode;
	onRowClick?: (row: TData) => void;
}) {
	const [busqueda, setBusqueda] = useState("");
	const table = useTable({
		features: tablaFeatures,
		columns,
		data,
		getRowId: (row) => row.id,
		initialState: { sorting: initialSorting ?? [] },
	});
	const columnas = table.getAllLeafColumns();
	const buscables = columnas.filter((columna) => columna.columnDef.meta?.filtro?.tipo === "texto");
	const filtros = columnas.filter((columna) => columna.columnDef.meta?.filtro?.tipo === "opciones");
	const filas = table.getRowModel().rows.filter((fila) =>
		coincide(
			busqueda,
			buscables.map((columna) => {
				const valor = fila.getValue(columna.id);
				const filtro = columna.columnDef.meta?.filtro;

				// Se busca en lo que se ve: "Agosto 2026" en lugar de "2026-08".
				return filtro?.tipo === "texto" && filtro.texto ? filtro.texto(valor) : String(valor ?? "");
			}),
		),
	);
	const hayFiltros = table.state.columnFilters.length > 0 || busqueda.trim() !== "";
	const titulo = (columna: (typeof columnas)[number]) =>
		typeof columna.columnDef.header === "string" ? columna.columnDef.header : "";

	return (
		<div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card">
			<div className="flex flex-col gap-3 border-b border-navy-100 p-4 md:flex-row md:items-center">
				<div className="relative flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-navy-400"
						aria-hidden="true"
					/>
					<Input
						type="search"
						value={busqueda}
						onChange={(event) => setBusqueda(event.target.value)}
						placeholder={buscar}
						aria-label="Buscar"
						className="h-10 pl-9"
					/>
				</div>
				{filtros.map((columna) => {
					const filtro = columna.columnDef.meta?.filtro;

					return filtro?.tipo === "opciones" ? (
						<FiltroOpciones
							key={columna.id}
							filtro={filtro}
							titulo={titulo(columna)}
							valor={(columna.getFilterValue() as string | undefined) ?? ""}
							onChange={(valor) => columna.setFilterValue(valor === "" ? undefined : valor)}
						/>
					) : null;
				})}
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-sm">
					<thead className="border-b border-navy-100 bg-navy-50/50">
						<tr>
							{columnas.map((columna) => (
								<th
									key={columna.id}
									scope="col"
									className={cn(
										"px-4 py-3 text-xs font-medium whitespace-nowrap text-navy-500",
										ALINEACION[
											columna.id === "acciones"
												? "derecha"
												: (columna.columnDef.meta?.alineacion ?? "izquierda")
										],
									)}
								>
									{columna.id === "acciones" ? (
										<span className="sr-only">Acciones</span>
									) : (
										titulo(columna)
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-navy-100">
						{filas.length === 0 ? (
							<tr>
								<td colSpan={columnas.length} className="px-4 py-12 text-center">
									{hayFiltros ? (
										<div className="flex flex-col items-center gap-3 text-muted-foreground">
											<SearchX className="size-6 text-navy-300" aria-hidden="true" />
											<span>Ningún registro coincide con la búsqueda.</span>
											<Button
												variant="outline"
												className="h-8 px-3"
												onClick={() => {
													setBusqueda("");
													table.resetColumnFilters();
												}}
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
							filas.map((fila) => (
								<tr
									key={fila.id}
									className={cn(
										"text-navy-700 transition-colors hover:bg-navy-50/60",
										onRowClick && "cursor-pointer",
									)}
									onClick={onRowClick ? () => onRowClick(fila.original) : undefined}
								>
									{fila.getAllCells().map((cell) => (
										<td
											key={cell.id}
											className={cn(
												celda,
												ALINEACION[
													cell.column.id === "acciones"
														? "derecha"
														: (cell.column.columnDef.meta?.alineacion ?? "izquierda")
												],
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
			<p className="border-t border-navy-100 bg-navy-50/40 px-4 py-2.5 text-[13px] text-muted-foreground">
				{filas.length} de {data.length} {data.length === 1 ? "registro" : "registros"}
			</p>
		</div>
	);
}
