import { useLiveQuery } from "dexie-react-hooks";
import { Building2, MoreHorizontal, Pencil, Plus, Power, SearchX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { NativeSelect } from "@/shared/components/NativeSelect";
import { PageHeader } from "@/shared/components/PageHeader";
import { Pill } from "@/shared/components/Pill";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

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

const columnHelper = crearColumnas<Tercero>();

function EstadoPill({ estado }: { estado: EstadoTercero }) {
	return (
		<Pill tone={estado === "ACTIVO" ? "success" : "neutral"} dot>
			{ETIQUETA_ESTADO[estado]}
		</Pill>
	);
}

function TipoPill({ tipo }: { tipo: TipoTercero }) {
	return <Pill tone={tipo === "CLIENTE" ? "brand" : "indigo"}>{ETIQUETA_TIPO[tipo]}</Pill>;
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
							<TipoPill tipo={tercero.tipo} />
							<EstadoPill estado={tercero.estado} />
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
	const usuario = user?.email ?? "desconocido";
	const terceros = useLiveQuery(async () => terceroRepository.listar());
	const [busqueda, setBusqueda] = useState("");
	const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("ACTIVO");
	const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("TODOS");
	const [formulario, setFormulario] = useState<{ open: boolean; tercero?: Tercero }>({
		open: false,
	});
	const [porDesactivar, setPorDesactivar] = useState<Tercero | null>(null);

	const editar = useCallback((tercero: Tercero) => setFormulario({ open: true, tercero }), []);
	const cambiarEstado = useCallback(
		(tercero: Tercero) => {
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

	const filtrados = useMemo(
		() =>
			(terceros ?? []).filter(
				(tercero) =>
					(filtroEstado === "TODOS" || tercero.estado === filtroEstado) &&
					(filtroTipo === "TODOS" || tercero.tipo === filtroTipo) &&
					coincide(busqueda, [tercero.razonSocial, tercero.ruc, tercero.codigo]),
			),
		[terceros, busqueda, filtroEstado, filtroTipo],
	);

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
					cell: ({ getValue }) => <TipoPill tipo={getValue()} />,
				}),
				columnHelper.accessor("telefono", {
					header: "Teléfono",
					enableSorting: false,
					cell: ({ getValue }) => getValue() || <span className="text-navy-300">—</span>,
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					enableSorting: false,
					cell: ({ getValue }) => <EstadoPill estado={getValue()} />,
				}),
				columnHelper.display({
					id: "acciones",
					header: () => <span className="sr-only">Acciones</span>,
					cell: ({ row }) => (
						<AccionesMenu
							tercero={row.original}
							onEditar={editar}
							onCambiarEstado={cambiarEstado}
						/>
					),
				}),
			]),
		[editar, cambiarEstado],
	);

	const limpiarFiltros = () => {
		setBusqueda("");
		setFiltroEstado("TODOS");
		setFiltroTipo("TODOS");
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Clientes"
				description="Clientes y proveedores con los que H&M tiene contratos."
				actions={
					<Button className="h-9 px-3.5" onClick={() => setFormulario({ open: true })}>
						<Plus />
						Agregar cliente
					</Button>
				}
			/>

			{terceros === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : terceros.length === 0 ? (
				<EmptyState
					icon={Building2}
					title="No hay clientes registrados"
					description="Registra un cliente con su RUC para poder crear contratos a su nombre."
				/>
			) : (
				<ListCard
					busqueda={busqueda}
					onBusquedaChange={setBusqueda}
					placeholder="Buscar por razón social, RUC o código"
					total={terceros.length}
					visibles={filtrados.length}
					filtros={
						<>
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
						</>
					}
				>
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
								<DataTable
									data={filtrados}
									columns={columns}
									initialSorting={[{ id: "codigo", desc: false }]}
									cellClassName={(id) =>
										id === "razonSocial"
											? "max-w-80"
											: id === "ruc" || id === "codigo"
												? "tabular-nums"
												: id === "acciones"
													? "w-12 text-right"
													: undefined
									}
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
				</ListCard>
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
