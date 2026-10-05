import { type ColumnDef, type SortingState, useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type TablaFeatures, tablaFeatures } from "@/shared/lib/tabla";

// Tabla ordenable con el estilo del sistema. Las columnas se definen con `crearColumnas`.
export function DataTable<TData extends { id: string }>({
	data,
	columns,
	initialSorting,
	cellClassName,
}: {
	data: TData[];
	columns: ColumnDef<TablaFeatures, TData>[];
	initialSorting?: SortingState;
	cellClassName?: (columnId: string) => string | undefined;
}) {
	const table = useTable({
		features: tablaFeatures,
		columns,
		data,
		getRowId: (row) => row.id,
		initialState: { sorting: initialSorting ?? [] },
	});

	return (
		<Table>
			<TableHeader className="bg-navy-50">
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id} className="hover:bg-transparent">
						{headerGroup.headers.map((header) => {
							const sorted = header.column.getIsSorted();
							const SortIcon =
								sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;

							return (
								<TableHead
									key={header.id}
									className="h-10 px-4 text-xs font-medium text-muted-foreground"
									aria-sort={
										sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
									}
								>
									{header.column.getCanSort() ? (
										<button
											type="button"
											onClick={header.column.getToggleSortingHandler()}
											className="inline-flex items-center gap-1 hover:text-navy-900"
										>
											<table.FlexRender header={header} />
											<SortIcon className="size-3.5" aria-hidden="true" />
										</button>
									) : (
										<table.FlexRender header={header} />
									)}
								</TableHead>
							);
						})}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow key={row.id} className="hover:bg-navy-50/50">
						{row.getAllCells().map((cell) => (
							<TableCell
								key={cell.id}
								className={cn("px-4 py-3 text-sm text-navy-700", cellClassName?.(cell.column.id))}
							>
								<table.FlexRender cell={cell} />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
