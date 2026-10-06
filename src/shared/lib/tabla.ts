import {
	columnFilteringFeature,
	type ColumnHelper,
	constructFilterFn,
	createColumnHelper,
	createFilteredRowModel,
	createSortedRowModel,
	filterFn_equalsString as filterFnEqualsString,
	filterFn_includesString as filterFnIncludesString,
	rowSortingFeature,
	sortFn_alphanumeric as sortFnAlphanumeric,
	sortFn_text as sortFnText,
	tableFeatures,
} from "@tanstack/react-table";

import { normalizar } from "./texto";

export interface OpcionFiltro {
	valor: string;
	etiqueta: string;
}

// Filtro de la fila de filtros bajo los encabezados: texto libre o lista de opciones.
export type FiltroColumna =
	{ tipo: "texto"; placeholder?: string } | { tipo: "opciones"; opciones: OpcionFiltro[] };

export interface MetaColumna {
	filtro?: FiltroColumna;
	alineacion?: "izquierda" | "centro" | "derecha";
	// Clases extra para las celdas de la columna (ancho, truncado…).
	celda?: string;
}

// Busca sin distinguir tildes ni mayúsculas ("nunoa" encuentra "ÑUÑOA").
const contiene = constructFilterFn({
	...filterFnIncludesString,
	resolveFilterValue: (valor: unknown) => normalizar(String(valor)),
	resolveDataValue: (valor: unknown) => normalizar(String(valor)),
});

// Funciones de TanStack Table v9 que usan los listados del sistema.
export const tablaFeatures = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	sortFns: { alphanumeric: sortFnAlphanumeric, text: sortFnText },
	filterFns: { contiene, igual: filterFnEqualsString },
	columnMeta: {} as MetaColumna,
});

export type TablaFeatures = typeof tablaFeatures;

export function crearColumnas<TData extends object>(): ColumnHelper<TablaFeatures, TData> {
	return createColumnHelper<TablaFeatures, TData>();
}
