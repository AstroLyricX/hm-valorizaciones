import { useLiveQuery } from "dexie-react-hooks";
import { Building2, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { AccionesFila } from "@/shared/components/AccionesFila";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { Pill } from "@/shared/components/Pill";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

import { terceroRepository, terceroService } from "./application/terceroService.instance";
import {
	ESTADOS_TERCERO,
	type EstadoTercero,
	ETIQUETA_ESTADO,
	type Tercero,
} from "./domain/tercero";
import { TerceroFormDialog } from "./ui/TerceroFormDialog";

const columnHelper = crearColumnas<Tercero>();

function EstadoPill({ estado }: { estado: EstadoTercero }) {
	return (
		<Pill tone={estado === "ACTIVO" ? "success" : "neutral"} dot>
			{ETIQUETA_ESTADO[estado]}
		</Pill>
	);
}

export function ClientesPage() {
	const { user } = useSession();
	const usuario = user?.email ?? "desconocido";
	const terceros = useLiveQuery(async () => terceroRepository.listar());
	const [busqueda, setBusqueda] = useState("");
	const [formulario, setFormulario] = useState<{ open: boolean; tercero?: Tercero }>({
		open: false,
	});
	const [porDesactivar, setPorDesactivar] = useState<Tercero | null>(null);

	const nuevo = useCallback(() => setFormulario({ open: true }), []);
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

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("codigo", {
					header: "Código",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap tabular-nums" },
				}),
				columnHelper.accessor("razonSocial", {
					header: "Razón social",
					filterFn: "contiene",
					meta: {
						filtro: { tipo: "texto" },
						alineacion: "izquierda",
						celda: "min-w-44 font-medium text-navy-900",
					},
				}),
				columnHelper.accessor("ruc", {
					header: "RUC",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "tabular-nums" },
				}),
				columnHelper.accessor("representanteNombre", {
					header: "Representante",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, alineacion: "izquierda", celda: "min-w-40" },
				}),
				columnHelper.accessor("correo", {
					header: "Correo",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, alineacion: "izquierda", celda: "max-w-56 truncate" },
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					filterFn: "igual",
					meta: {
						filtro: {
							tipo: "opciones",
							opciones: ESTADOS_TERCERO.map((estado) => ({
								valor: estado,
								etiqueta: ETIQUETA_ESTADO[estado],
							})),
						},
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
									etiqueta: `Editar ${row.original.razonSocial}`,
									onClick: () => editar(row.original),
								},
								row.original.estado === "ACTIVO"
									? {
											tipo: "desactivar",
											etiqueta: `Desactivar ${row.original.razonSocial}`,
											onClick: () => cambiarEstado(row.original),
										}
									: {
											tipo: "activar",
											etiqueta: `Activar ${row.original.razonSocial}`,
											onClick: () => cambiarEstado(row.original),
										},
							]}
						/>
					),
				}),
			]),
		[editar, cambiarEstado],
	);

	const filtradosMovil = useMemo(
		() =>
			(terceros ?? []).filter((tercero) =>
				coincide(busqueda, [
					tercero.razonSocial,
					tercero.ruc,
					tercero.codigo,
					tercero.representanteNombre,
				]),
			),
		[terceros, busqueda],
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Clientes"
				description="Empresas con las que H&M tiene contratos y dueños de los equipos."
				actions={
					<Button className="h-9 px-3.5 md:hidden" onClick={nuevo}>
						<Plus />
						Agregar cliente
					</Button>
				}
			/>

			{terceros === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : (
				<>
					<div className="hidden md:block">
						<DataTable
							data={terceros}
							columns={columns}
							initialSorting={[{ id: "codigo", desc: false }]}
							nuevo={{ label: "Nuevo", onClick: nuevo }}
							vacio={
								<span className="text-muted-foreground">
									No hay clientes registrados. Usa «Nuevo» para agregar el primero.
								</span>
							}
						/>
					</div>
					<div className="md:hidden">
						{terceros.length === 0 ? (
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
								visibles={filtradosMovil.length}
							>
								<ul className="divide-y divide-navy-100">
									{filtradosMovil.map((tercero) => (
										<li key={tercero.id} className="flex items-start gap-3 px-4 py-3.5">
											<button
												type="button"
												onClick={() => editar(tercero)}
												className="flex min-w-0 flex-1 flex-col gap-1.5 text-left"
											>
												<span className="truncate font-medium text-navy-900">
													{tercero.razonSocial}
												</span>
												<span className="text-[13px] text-muted-foreground tabular-nums">
													{tercero.codigo} · RUC {tercero.ruc}
												</span>
												<span className="text-[13px] text-navy-600">
													{tercero.representanteNombre}
												</span>
												<EstadoPill estado={tercero.estado} />
											</button>
										</li>
									))}
								</ul>
							</ListCard>
						)}
					</div>
				</>
			)}

			<TerceroFormDialog
				open={formulario.open}
				tercero={formulario.tercero}
				onOpenChange={(open: boolean) => setFormulario((actual) => ({ ...actual, open }))}
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
