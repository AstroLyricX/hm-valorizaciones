import { useLiveQuery } from "dexie-react-hooks";
import { Building2, Plus, Truck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { cn } from "@/lib/utils";
import { AccionesFila } from "@/shared/components/AccionesFila";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { Pill, type PillTone } from "@/shared/components/Pill";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

import { equipoRepository } from "./application/equipoService.instance";
import {
	CATEGORIAS_EQUIPO,
	type Equipo,
	type EstadoEquipo,
	ESTADOS_EQUIPO,
	ETIQUETA_CATEGORIA,
	ETIQUETA_ESTADO_EQUIPO,
	nombreEquipo,
} from "./domain/equipo";
import { EquipoFormDialog } from "./ui/EquipoFormDialog";

const TONO_ESTADO: Record<EstadoEquipo, PillTone> = {
	SB: "warning",
	FM: "danger",
	FO: "neutral",
	OP: "warning",
	P: "brand",
	D: "neutral",
};

interface FilaEquipo extends Equipo {
	dueno: string;
}

function EstadoPill({ estado }: { estado: EstadoEquipo }) {
	return (
		<Pill tone={TONO_ESTADO[estado]} dot>
			{ETIQUETA_ESTADO_EQUIPO[estado]}
		</Pill>
	);
}

const columnHelper = crearColumnas<FilaEquipo>();

export function EquiposPage() {
	const datos = useLiveQuery(async () => {
		const [equipos, terceros] = await Promise.all([
			equipoRepository.listar(),
			terceroRepository.listar(),
		]);
		const nombres = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]));

		return {
			equipos: equipos.map((equipo): FilaEquipo => ({
				...equipo,
				dueno: nombres.get(equipo.duenoId) ?? "—",
			})),
			duenos: terceros.filter((tercero) => tercero.estado === "ACTIVO"),
		};
	});
	const [busqueda, setBusqueda] = useState("");
	const [formulario, setFormulario] = useState<{ open: boolean; equipo?: Equipo }>({ open: false });

	const nuevo = useCallback(() => setFormulario({ open: true }), []);
	const editar = useCallback((equipo: Equipo) => setFormulario({ open: true, equipo }), []);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("activoFijo", {
					header: "Activo fijo",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap" },
				}),
				columnHelper.accessor((equipo) => nombreEquipo(equipo), {
					id: "equipo",
					header: "Equipo",
					filterFn: "contiene",
					meta: {
						filtro: { tipo: "texto" },
						alineacion: "izquierda",
						celda: "min-w-44 font-medium text-navy-900",
					},
				}),
				columnHelper.accessor("placa", {
					header: "Placa",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap" },
				}),
				columnHelper.accessor("anio", {
					header: "Año",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "tabular-nums" },
				}),
				columnHelper.accessor("categoria", {
					header: "Categoría",
					filterFn: "igual",
					meta: {
						filtro: {
							tipo: "opciones",
							opciones: CATEGORIAS_EQUIPO.map((categoria) => ({
								valor: categoria,
								etiqueta: ETIQUETA_CATEGORIA[categoria],
							})),
						},
					},
					cell: ({ getValue }) => ETIQUETA_CATEGORIA[getValue()],
				}),
				columnHelper.accessor("dueno", {
					header: "Dueño",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, alineacion: "izquierda", celda: "min-w-36" },
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					filterFn: "igual",
					meta: {
						filtro: {
							tipo: "opciones",
							opciones: ESTADOS_EQUIPO.map((estado) => ({
								valor: estado,
								etiqueta: ETIQUETA_ESTADO_EQUIPO[estado],
							})),
						},
						celda: "whitespace-nowrap",
					},
					cell: ({ getValue }) => <EstadoPill estado={getValue()} />,
				}),
				columnHelper.display({
					id: "acciones",
					meta: { celda: "w-28" },
					cell: ({ row }) => (
						<AccionesFila
							acciones={[
								{
									tipo: "editar",
									etiqueta: `Editar ${row.original.activoFijo}`,
									onClick: () => editar(row.original),
								},
							]}
						/>
					),
				}),
			]),
		[editar],
	);

	const filtradosMovil = useMemo(
		() =>
			(datos?.equipos ?? []).filter((equipo) =>
				coincide(busqueda, [nombreEquipo(equipo), equipo.activoFijo, equipo.placa, equipo.dueno]),
			),
		[datos, busqueda],
	);

	if (datos === undefined) {
		return <Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />;
	}

	const { equipos, duenos } = datos;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Equipos"
				description="Maquinaria con su activo fijo, placa, dueño y estado."
				actions={
					duenos.length > 0 && (
						<Button className="h-9 px-3.5 md:hidden" onClick={nuevo}>
							<Plus />
							Agregar equipo
						</Button>
					)
				}
			/>

			{duenos.length === 0 && equipos.length === 0 ? (
				<EmptyState
					icon={Building2}
					title="Primero registra un cliente"
					description="Cada equipo tiene un dueño, que debe estar registrado como cliente."
				>
					<Link to="/clientes" className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}>
						Ir a clientes
					</Link>
				</EmptyState>
			) : (
				<>
					<div className="hidden md:block">
						<DataTable
							data={equipos}
							columns={columns}
							initialSorting={[{ id: "activoFijo", desc: false }]}
							nuevo={{ label: "Nuevo", onClick: nuevo }}
							vacio={
								<span className="text-muted-foreground">
									No hay equipos registrados. Usa «Nuevo» para agregar el primero.
								</span>
							}
						/>
					</div>
					<div className="md:hidden">
						{equipos.length === 0 ? (
							<EmptyState
								icon={Truck}
								title="No hay equipos registrados"
								description="Registra la maquinaria para asociarla a los contratos."
							/>
						) : (
							<ListCard
								busqueda={busqueda}
								onBusquedaChange={setBusqueda}
								placeholder="Buscar por equipo, activo fijo, placa o dueño"
								total={equipos.length}
								visibles={filtradosMovil.length}
							>
								<ul className="divide-y divide-navy-100">
									{filtradosMovil.map((equipo) => (
										<li key={equipo.id}>
											<button
												type="button"
												onClick={() => editar(equipo)}
												className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left"
											>
												<span className="flex items-start justify-between gap-3">
													<span className="font-medium text-navy-900">{nombreEquipo(equipo)}</span>
													<EstadoPill estado={equipo.estado} />
												</span>
												<span className="text-[13px] text-muted-foreground">
													{equipo.activoFijo} · Placa {equipo.placa} · {equipo.anio}
												</span>
												<span className="text-[13px] text-navy-600">{equipo.dueno}</span>
											</button>
										</li>
									))}
								</ul>
							</ListCard>
						)}
					</div>
				</>
			)}

			<EquipoFormDialog
				open={formulario.open}
				equipo={formulario.equipo}
				duenos={duenos}
				onOpenChange={(open: boolean) => setFormulario((actual) => ({ ...actual, open }))}
			/>
		</div>
	);
}
