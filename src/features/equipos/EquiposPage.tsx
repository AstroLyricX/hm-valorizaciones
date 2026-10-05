import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus, SearchX, Truck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { NativeSelect } from "@/shared/components/NativeSelect";
import { PageHeader } from "@/shared/components/PageHeader";
import { Pill, type PillTone } from "@/shared/components/Pill";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

import { equipoRepository } from "./application/equipoService.instance";
import {
	type Equipo,
	type EstadoEquipo,
	ESTADOS_EQUIPO,
	ETIQUETA_ESTADO_EQUIPO,
	nombreEquipo,
} from "./domain/equipo";
import { EquipoFormSheet } from "./ui/EquipoFormSheet";

// "EN_USO" muestra todo menos los equipos dados de baja.
type FiltroEstado = EstadoEquipo | "EN_USO" | "TODOS";

const TONO_ESTADO: Record<EstadoEquipo, PillTone> = {
	OPERATIVO: "success",
	EN_MANTENIMIENTO: "warning",
	INOPERATIVO: "danger",
	BAJA: "neutral",
};

const formatoHoras = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

function formatearHorometro(horometro: string): string {
	return horometro === "" ? "—" : `${formatoHoras.format(Number(horometro))} h`;
}

function EstadoPill({ estado }: { estado: EstadoEquipo }) {
	return (
		<Pill tone={TONO_ESTADO[estado]} dot>
			{ETIQUETA_ESTADO_EQUIPO[estado]}
		</Pill>
	);
}

function detalleEquipo(equipo: Equipo): string {
	return [equipo.placa && `Placa ${equipo.placa}`, equipo.serie && `Serie ${equipo.serie}`]
		.filter(Boolean)
		.join(" · ");
}

const columnHelper = crearColumnas<Equipo>();

function EquiposTarjetas({
	equipos,
	onEditar,
}: {
	equipos: Equipo[];
	onEditar: (equipo: Equipo) => void;
}) {
	return (
		<ul className="divide-y divide-navy-100">
			{equipos.map((equipo) => (
				<li key={equipo.id}>
					<button
						type="button"
						onClick={() => onEditar(equipo)}
						className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left"
					>
						<span className="flex items-start justify-between gap-3">
							<span className="font-medium text-navy-900">{nombreEquipo(equipo)}</span>
							<EstadoPill estado={equipo.estado} />
						</span>
						<span className="text-[13px] text-muted-foreground tabular-nums">
							{[equipo.codigo, detalleEquipo(equipo), formatearHorometro(equipo.horometro)]
								.filter((parte) => parte && parte !== "—")
								.join(" · ")}
						</span>
						{equipo.ubicacion && (
							<span className="text-[13px] text-navy-600">{equipo.ubicacion}</span>
						)}
					</button>
				</li>
			))}
		</ul>
	);
}

export function EquiposPage() {
	const equipos = useLiveQuery(async () => equipoRepository.listar());
	const [busqueda, setBusqueda] = useState("");
	const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("EN_USO");
	const [filtroTipo, setFiltroTipo] = useState("TODOS");
	const [formulario, setFormulario] = useState<{ open: boolean; equipo?: Equipo }>({ open: false });

	const editar = useCallback((equipo: Equipo) => setFormulario({ open: true, equipo }), []);

	const tipos = useMemo(
		() => [...new Set((equipos ?? []).map((equipo) => equipo.tipo))].sort(),
		[equipos],
	);

	const filtrados = useMemo(
		() =>
			(equipos ?? []).filter(
				(equipo) =>
					(filtroEstado === "TODOS" ||
						(filtroEstado === "EN_USO"
							? equipo.estado !== "BAJA"
							: equipo.estado === filtroEstado)) &&
					(filtroTipo === "TODOS" || equipo.tipo === filtroTipo) &&
					coincide(busqueda, [
						nombreEquipo(equipo),
						equipo.codigo,
						equipo.placa,
						equipo.serie,
						equipo.ubicacion,
						equipo.propietario,
					]),
			),
		[equipos, busqueda, filtroEstado, filtroTipo],
	);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("codigo", { header: "Código", sortFn: "alphanumeric" }),
				columnHelper.accessor((equipo) => nombreEquipo(equipo), {
					id: "equipo",
					header: "Equipo",
					sortFn: "text",
					cell: ({ row }) => (
						<div className="flex min-w-0 flex-col">
							<span className="truncate font-medium text-navy-900">
								{nombreEquipo(row.original)}
							</span>
							{detalleEquipo(row.original) && (
								<span className="truncate text-xs text-muted-foreground">
									{detalleEquipo(row.original)}
								</span>
							)}
						</div>
					),
				}),
				columnHelper.accessor("anio", {
					header: "Año",
					enableSorting: false,
					cell: ({ getValue }) => getValue() || <span className="text-navy-300">—</span>,
				}),
				columnHelper.accessor("horometro", {
					header: "Horómetro",
					enableSorting: false,
					cell: ({ getValue }) => formatearHorometro(getValue()),
				}),
				columnHelper.accessor("ubicacion", {
					header: "Ubicación",
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
						<Button
							variant="ghost"
							size="icon"
							aria-label={`Editar ${nombreEquipo(row.original)}`}
							className="text-navy-500"
							onClick={() => editar(row.original)}
						>
							<Pencil />
						</Button>
					),
				}),
			]),
		[editar],
	);

	const limpiarFiltros = () => {
		setBusqueda("");
		setFiltroEstado("TODOS");
		setFiltroTipo("TODOS");
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Equipos"
				description="Maquinaria con su estado, placa, horómetro y ubicación."
				actions={
					<Button className="h-9 px-3.5" onClick={() => setFormulario({ open: true })}>
						<Plus />
						Agregar equipo
					</Button>
				}
			/>

			{equipos === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : equipos.length === 0 ? (
				<EmptyState
					icon={Truck}
					title="No hay equipos registrados"
					description="Registra la maquinaria para asociarla a los ítems de los contratos."
				/>
			) : (
				<ListCard
					busqueda={busqueda}
					onBusquedaChange={setBusqueda}
					placeholder="Buscar por equipo, placa, serie, código o ubicación"
					total={equipos.length}
					visibles={filtrados.length}
					filtros={
						<>
							<NativeSelect
								aria-label="Filtrar por tipo"
								value={filtroTipo}
								onChange={(event) => setFiltroTipo(event.target.value)}
								className="md:w-48"
							>
								<option value="TODOS">Todos los tipos</option>
								{tipos.map((tipo) => (
									<option key={tipo} value={tipo}>
										{tipo}
									</option>
								))}
							</NativeSelect>
							<NativeSelect
								aria-label="Filtrar por estado"
								value={filtroEstado}
								onChange={(event) => setFiltroEstado(event.target.value as FiltroEstado)}
								className="md:w-48"
							>
								<option value="EN_USO">Sin equipos de baja</option>
								{ESTADOS_EQUIPO.map((estado) => (
									<option key={estado} value={estado}>
										{ETIQUETA_ESTADO_EQUIPO[estado]}
									</option>
								))}
								<option value="TODOS">Todos los estados</option>
							</NativeSelect>
						</>
					}
				>
					{filtrados.length === 0 ? (
						<EmptyState
							icon={SearchX}
							title="Sin resultados"
							description="Ningún equipo coincide con la búsqueda o los filtros."
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
										id === "equipo"
											? "max-w-80"
											: id === "codigo" || id === "horometro" || id === "anio"
												? "tabular-nums"
												: id === "acciones"
													? "w-12 text-right"
													: undefined
									}
								/>
							</div>
							<div className="md:hidden">
								<EquiposTarjetas equipos={filtrados} onEditar={editar} />
							</div>
						</>
					)}
				</ListCard>
			)}

			<EquipoFormSheet
				open={formulario.open}
				equipo={formulario.equipo}
				onOpenChange={(open) => setFormulario((actual) => ({ ...actual, open }))}
			/>
		</div>
	);
}
