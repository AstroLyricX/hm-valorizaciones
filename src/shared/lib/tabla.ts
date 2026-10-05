import {
	type ColumnHelper,
	createColumnHelper,
	createSortedRowModel,
	rowSortingFeature,
	sortFn_alphanumeric as sortFnAlphanumeric,
	sortFn_text as sortFnText,
	tableFeatures,
} from "@tanstack/react-table";

// Funciones de TanStack Table v9 que usan los listados del sistema (solo ordenamiento).
export const tablaFeatures = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFnAlphanumeric, text: sortFnText },
});

export type TablaFeatures = typeof tablaFeatures;

export function crearColumnas<TData extends object>(): ColumnHelper<TablaFeatures, TData> {
	return createColumnHelper<TablaFeatures, TData>();
}
