import {
	createColumnHelper,
	createSortedRowModel,
	rowSortingFeature,
	sortFn_alphanumeric as sortFnAlphanumeric,
	sortFn_text as sortFnText,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { useLiveQuery } from "dexie-react-hooks";
import {
	ArrowDown,
	ArrowUp,
	Building2,
	ChevronsUpDown,
	MoreHorizontal,
	Pencil,
	Plus,
	Power,
	Search,
	SearchX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useSession } from "@/features/auth/useSession";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState } from "@/shared/components/EmptyState";
import { NativeSelect } from "@/shared/components/NativeSelect";
import { PageHeader } from "@/shared/components/PageHeader";

import { terceroRepository, terceroService } from "./application/terceroService.instance";
import {
	type EstadoTercero,
	ETIQUETA_ESTADO,
	ETIQUETA_TIPO,
	type Tercero,
	type TipoTercero,
} from "./domain/tercero";
import { TerceroFormSheet } from "./ui/TerceroFormSheet";

type FiltroEstado = EstadoTercero | "TODOS";
type FiltroTipo = TipoTercero | "TODOS";

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortFnAlphanumeric, text: sortFnText },
});
const columnHelper = createColumnHelper<typeof features, Tercero>();

function normalizar(texto: string): string {
	return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function EstadoBadge({ estado }: { estado: EstadoTercero }) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-1.5 border-transparent font-medium",
				estado === "ACTIVO" ? "bg-emerald-50 text-emerald-700" : "bg-navy-100 text-navy-600",
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					estado === "ACTIVO" ? "bg-emerald-500" : "bg-navy-400",
				)}
			/>
			{ETIQUETA_ESTADO[estado]}
		</Badge>
	);
}

function TipoBadge({ tipo }: { tipo: TipoTercero }) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"border-transparent font-medium",
				tipo === "CLIENTE" ? "bg-brand-50 text-brand-700" : "bg-indigo-50 text-indigo-700",
			)}
		>
			{ETIQUETA_TIPO[tipo]}
		</Badge>
	);
}

function AccionesMenu({
	tercero,
	onEditar,
	onCambiarEstado,
}: {
	tercero: Tercero;
	onEditar: (tercero: Tercero) => void;
	onCambiarEstado: (tercero: Tercero) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Acciones de ${tercero.razonSocial}`}
						className="text-navy-500"
					/>
				}
			>
				<MoreHorizontal />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuItem onClick={() => onEditar(tercero)}>
					<Pencil />
					Editar
				</DropdownMenuItem>
				<DropdownMenuItem
					variant={tercero.estado === "ACTIVO" ? "destructive" : "default"}
					onClick={() => onCambiarEstado(tercero)}
				>
					<Power />
					{tercero.estado === "ACTIVO" ? "Desactivar" : "Activar"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TercerosTabla({
	terceros,
	onEditar,
	onCambiarEstado,
}: {
	terceros: Tercero[];
	onEditar: (tercero: Tercero) => void;
	onCambiarEstado: (tercero: Tercero) => void;
}) {
	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("codigo", { header: "Código", sortFn: "alphanumeric" }),
				columnHelper.accessor("razonSocial", {
					header: "Razón social",
					sortFn: "text",
					cell: ({ row }) => (
						<div className="flex min-w-0 flex-col">
							<span className="truncate font-medium text-navy-900">{row.original.razonSocial}</span>
							{row.original.contacto && (
								<span className="truncate text-xs text-muted-foreground">
									{row.original.contacto}
								</span>
							)}
						</div>
					),
				}),
				columnHelper.accessor("ruc", { header: "RUC", enableSorting: false }),
				columnHelper.accessor("tipo", {
					header: "Tipo",
					enableSorting: false,
					cell: ({ getValue }) => <TipoBadge tipo={getValue()} />,
				}),
				columnHelper.accessor("telefono", {
					header: "Teléfono",
					enableSorting: false,
					cell: ({ getValue }) => getValue() || <span className="text-navy-300">—</span>,
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					enableSorting: false,
					cell: ({ getValue }) => <EstadoBadge estado={getValue()} />,
				}),
				columnHelper.display({
					id: "acciones",
					header: () => <span className="sr-only">Acciones</span>,
					cell: ({ row }) => (
						<AccionesMenu
							tercero={row.original}
							onEditar={onEditar}
							onCambiarEstado={onCambiarEstado}
						/>
					),
				}),
			]),
		[onEditar, onCambiarEstado],
	);

	const table = useTable({
		features,
		columns,
		data: terceros,
		getRowId: (row) => row.id,
		initialState: { sorting: [{ id: "codigo", desc: false }] },
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
								className={cn(
									"px-4 py-3 text-sm text-navy-700",
									cell.column.id === "razonSocial" && "max-w-80",
									(cell.column.id === "ruc" || cell.column.id === "codigo") && "tabular-nums",
									cell.column.id === "acciones" && "w-12 text-right",
								)}
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

function TercerosTarjetas({
	terceros,
	onEditar,
	onCambiarEstado,
}: {
	terceros: Tercero[];
	onEditar: (tercero: Tercero) => void;
	onCambiarEstado: (tercero: Tercero) => void;
}) {
	return (
		<ul className="divide-y divide-navy-100">
			{terceros.map((tercero) => (
				<li key={tercero.id} className="flex items-start gap-3 px-4 py-3.5">
					<button
						type="button"
						onClick={() => onEditar(tercero)}
						className="flex min-w-0 flex-1 flex-col gap-1.5 text-left"
					>
						<span className="truncate font-medium text-navy-900">{tercero.razonSocial}</span>
						<span className="text-[13px] text-muted-foreground tabular-nums">
							{tercero.codigo} · RUC {tercero.ruc}
						</span>
						<span className="flex flex-wrap gap-1.5">
							<TipoBadge tipo={tercero.tipo} />
							<EstadoBadge estado={tercero.estado} />
						</span>
					</button>
					<AccionesMenu tercero={tercero} onEditar={onEditar} onCambiarEstado={onCambiarEstado} />
				</li>
			))}
		</ul>
	);
}

export function ClientesPage() {
	const { user } = useSession();
	const terceros = useLiveQuery(async () => terceroRepository.listar());
	const [busqueda, setBusqueda] = useState("");
	const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("ACTIVO");
	const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODOS");
	const [formulario, setFormulario] = useState<{ open: boolean; tercero?: Tercero }>({
		open: false,
	});
	const [porDesactivar, setPorDesactivar] = useState<Tercero | null>(null);

	const filtrados = useMemo(() => {
		const texto = normalizar(busqueda.trim());

		return (terceros ?? []).filter(
			(tercero) =>
				(filtroEstado === "TODOS" || tercero.estado === filtroEstado) &&
				(filtroTipo === "TODOS" || tercero.tipo === filtroTipo) &&
				(texto === "" ||
					normalizar(tercero.razonSocial).includes(texto) ||
					tercero.ruc.includes(texto) ||
					normalizar(tercero.codigo).includes(texto)),
		);
	}, [terceros, busqueda, filtroEstado, filtroTipo]);

	const usuario = user?.email ?? "desconocido";
	const abrirNuevo = () => setFormulario({ open: true });
	const editar = useMemo(() => (tercero: Tercero) => setFormulario({ open: true, tercero }), []);
	const cambiarEstado = useMemo(
		() => (tercero: Tercero) => {
			if (tercero.estado === "ACTIVO") {
				setPorDesactivar(tercero);

				return;
			}
			void terceroService
				.cambiarEstado(tercero.id, "ACTIVO", usuario)
				.then(() => toast.success(`${tercero.razonSocial} está activo de nuevo.`));
		},
		[usuario],
	);

	const limpiarFiltros = () => {
		setBusqueda("");
		setFiltroEstado("TODOS");
		setFiltroTipo("TODOS");
	};

	const hayRegistros = (terceros?.length ?? 0) > 0;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Clientes"
				description="Clientes y proveedores con los que H&M tiene contratos."
				actions={
					<Button className="h-9 px-3.5" onClick={abrirNuevo}>
						<Plus />
						Agregar cliente
					</Button>
				}
			/>

			{terceros === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : !hayRegistros ? (
				<EmptyState
					icon={Building2}
					title="No hay clientes registrados"
					description="Registra un cliente con su RUC para poder crear contratos a su nombre."
				/>
			) : (
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
								placeholder="Buscar por razón social, RUC o código"
								aria-label="Buscar"
								className="h-10 pl-9"
							/>
						</div>
						<div className="grid grid-cols-2 gap-3 md:flex">
							<NativeSelect
								aria-label="Filtrar por tipo"
								value={filtroTipo}
								onChange={(event) => setFiltroTipo(event.target.value as FiltroTipo)}
								className="md:w-40"
							>
								<option value="TODOS">Todos los tipos</option>
								<option value="CLIENTE">Clientes</option>
								<option value="PROVEEDOR">Proveedores</option>
							</NativeSelect>
							<NativeSelect
								aria-label="Filtrar por estado"
								value={filtroEstado}
								onChange={(event) => setFiltroEstado(event.target.value as FiltroEstado)}
								className="md:w-40"
							>
								<option value="ACTIVO">Activos</option>
								<option value="INACTIVO">Inactivos</option>
								<option value="TODOS">Todos los estados</option>
							</NativeSelect>
						</div>
					</div>

					{filtrados.length === 0 ? (
						<EmptyState
							icon={SearchX}
							title="Sin resultados"
							description="Ningún registro coincide con la búsqueda o los filtros."
							className="rounded-none border-0 shadow-none"
						>
							<Button variant="outline" className="h-9 px-3.5" onClick={limpiarFiltros}>
								Limpiar filtros
							</Button>
						</EmptyState>
					) : (
						<>
							<div className="hidden md:block">
								<TercerosTabla
									terceros={filtrados}
									onEditar={editar}
									onCambiarEstado={cambiarEstado}
								/>
							</div>
							<div className="md:hidden">
								<TercerosTarjetas
									terceros={filtrados}
									onEditar={editar}
									onCambiarEstado={cambiarEstado}
								/>
							</div>
						</>
					)}

					<p className="border-t border-navy-100 bg-navy-50/60 px-4 py-2.5 text-[13px] text-muted-foreground">
						{filtrados.length} de {terceros.length}{" "}
						{terceros.length === 1 ? "registro" : "registros"}
					</p>
				</div>
			)}

			<TerceroFormSheet
				open={formulario.open}
				tercero={formulario.tercero}
				onOpenChange={(open) => setFormulario((actual) => ({ ...actual, open }))}
			/>
			<ConfirmDialog
				open={porDesactivar !== null}
				onOpenChange={(open) => !open && setPorDesactivar(null)}
				title={`¿Desactivar a ${porDesactivar?.razonSocial ?? ""}?`}
				description="No aparecerá al crear contratos nuevos. Sus contratos y valorizaciones se conservan y puedes reactivarlo cuando quieras."
				confirmLabel="Desactivar"
				onConfirm={() => {
					if (porDesactivar) {
						const { id, razonSocial } = porDesactivar;
						void terceroService
							.cambiarEstado(id, "INACTIVO", usuario)
							.then(() => toast.success(`${razonSocial} fue desactivado.`));
					}
				}}
			/>
		</div>
	);
}
