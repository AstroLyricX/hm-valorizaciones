import { useLiveQuery } from "dexie-react-hooks";
import { FileSignature, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { equipoRepository } from "@/features/equipos/application/equipoService.instance";
import { formatearMoneda } from "@/lib/dinero";
import { formatearFechaNumerica } from "@/lib/fechas";
import { AccionesFila } from "@/shared/components/AccionesFila";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { PageHeader } from "@/shared/components/PageHeader";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

import { contratoRepository } from "./application/contratoService.instance";
import {
	type Contrato,
	type EstadoContrato,
	estadoContrato,
	ESTADOS_CONTRATO,
	ETIQUETA_ESTADO_CONTRATO,
	hoyIso,
} from "./domain/contrato";
import { ContratoFormDialog } from "./ui/ContratoFormDialog";
import { EstadoContratoPill } from "./ui/EstadoContratoPill";
import { vigencia } from "./ui/vigencia";

interface FilaContrato extends Contrato {
	cliente: string;
	estado: EstadoContrato;
}

const columnHelper = crearColumnas<FilaContrato>();

export function ContratosPage() {
	const navigate = useNavigate();
	const datos = useLiveQuery(async () => {
		const [contratos, terceros, equipos] = await Promise.all([
			contratoRepository.listar(),
			terceroRepository.listar(),
			equipoRepository.listar(),
		]);
		const nombres = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]));
		const hoy = hoyIso();

		return {
			filas: contratos.map((contrato): FilaContrato => ({
				...contrato,
				cliente: nombres.get(contrato.terceroId) ?? "—",
				estado: estadoContrato(contrato, hoy),
			})),
			clientes: terceros.filter((tercero) => tercero.estado === "ACTIVO"),
			equipos,
		};
	});
	const [busqueda, setBusqueda] = useState("");
	const [formularioAbierto, setFormularioAbierto] = useState(false);

	// Un contrato necesita al menos un cliente activo y un equipo registrados.
	const nuevo = () => {
		if (!datos || datos.clientes.length === 0 || datos.equipos.length === 0) {
			toast.warning("Primero registra al menos un cliente y un equipo.");

			return;
		}
		setFormularioAbierto(true);
	};

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("codigo", {
					header: "Código",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap tabular-nums" },
				}),
				columnHelper.accessor("proyecto", {
					header: "Proyecto",
					filterFn: "contiene",
					meta: {
						filtro: { tipo: "texto" },
						alineacion: "izquierda",
						celda: "min-w-48 font-medium text-navy-900",
					},
				}),
				columnHelper.accessor("cliente", {
					header: "Cliente",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, alineacion: "izquierda", celda: "min-w-36" },
				}),
				columnHelper.accessor("fechaInicio", {
					header: "Vigencia",
					enableColumnFilter: false,
					meta: { celda: "whitespace-nowrap tabular-nums" },
					cell: ({ row }) => (
						<span className="flex flex-col leading-tight">
							<span>{formatearFechaNumerica(row.original.fechaInicio)}</span>
							<span className="text-xs text-muted-foreground">
								al {formatearFechaNumerica(row.original.fechaFin)}
							</span>
						</span>
					),
				}),
				columnHelper.accessor("montoContractual", {
					header: "Monto",
					enableColumnFilter: false,
					meta: {
						alineacion: "derecha",
						celda: "whitespace-nowrap font-medium text-navy-900 tabular-nums",
					},
					cell: ({ row }) => formatearMoneda(row.original.montoContractual, row.original.moneda),
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					filterFn: "igual",
					meta: {
						filtro: {
							tipo: "opciones",
							opciones: ESTADOS_CONTRATO.map((estado) => ({
								valor: estado,
								etiqueta: ETIQUETA_ESTADO_CONTRATO[estado],
							})),
						},
					},
					cell: ({ getValue }) => <EstadoContratoPill estado={getValue()} />,
				}),
				columnHelper.display({
					id: "acciones",
					meta: { celda: "w-28" },
					cell: ({ row }) => (
						<AccionesFila
							acciones={[
								{
									tipo: "ver",
									etiqueta: `Ver ${row.original.codigo}`,
									onClick: () => void navigate(`/contratos/${row.original.id}`),
								},
							]}
						/>
					),
				}),
			]),
		[navigate],
	);

	const filtradosMovil = useMemo(
		() =>
			(datos?.filas ?? []).filter((contrato) =>
				coincide(busqueda, [
					contrato.codigo,
					contrato.proyecto,
					contrato.cliente,
					contrato.ubicacion,
				]),
			),
		[datos, busqueda],
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Contratos"
				description="Contratos con sus equipos, horas mínimas, montos y vigencia."
				actions={
					<Button className="h-9 px-3.5 md:hidden" onClick={nuevo}>
						<Plus />
						Nuevo contrato
					</Button>
				}
			/>

			{datos === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : (
				<>
					<div className="hidden md:block">
						<DataTable
							data={datos.filas}
							columns={columns}
							initialSorting={[{ id: "codigo", desc: false }]}
							nuevo={{ label: "Nuevo", onClick: nuevo }}
							vacio={
								<span className="text-muted-foreground">
									No hay contratos registrados. Usa «Nuevo» para crear el primero.
								</span>
							}
						/>
					</div>
					<div className="md:hidden">
						{datos.filas.length === 0 ? (
							<EmptyState
								icon={FileSignature}
								title="No hay contratos registrados"
								description="Crea un contrato con su cliente y equipos para empezar a valorizarlo."
							/>
						) : (
							<ListCard
								busqueda={busqueda}
								onBusquedaChange={setBusqueda}
								placeholder="Buscar por código, proyecto o cliente"
								total={datos.filas.length}
								visibles={filtradosMovil.length}
							>
								<ul className="divide-y divide-navy-100">
									{filtradosMovil.map((contrato) => (
										<li key={contrato.id}>
											<Link
												to={`/contratos/${contrato.id}`}
												className="flex flex-col gap-1.5 px-4 py-3.5"
											>
												<span className="flex items-start justify-between gap-3">
													<span className="font-medium text-navy-900">{contrato.proyecto}</span>
													<EstadoContratoPill estado={contrato.estado} />
												</span>
												<span className="text-[13px] text-muted-foreground">
													{contrato.codigo} · {contrato.cliente}
												</span>
												<span className="flex items-baseline justify-between text-[13px]">
													<span className="text-muted-foreground">{vigencia(contrato)}</span>
													<span className="font-semibold text-navy-900 tabular-nums">
														{formatearMoneda(contrato.montoContractual, contrato.moneda)}
													</span>
												</span>
											</Link>
										</li>
									))}
								</ul>
							</ListCard>
						)}
					</div>
				</>
			)}

			{datos && (
				<ContratoFormDialog
					open={formularioAbierto}
					onOpenChange={setFormularioAbierto}
					clientes={datos.clientes}
					equipos={datos.equipos}
				/>
			)}
		</div>
	);
}
