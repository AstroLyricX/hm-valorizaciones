import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { AccionesFila } from "@/shared/components/AccionesFila";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { ListCard } from "@/shared/components/ListCard";
import { NuevaValorizacionButton } from "@/shared/components/NuevaValorizacionButton";
import { PageHeader } from "@/shared/components/PageHeader";
import { crearColumnas } from "@/shared/lib/tabla";
import { coincide } from "@/shared/lib/texto";

import { valorizacionService } from "./application/valorizacionService.instance";
import {
	ESTADOS_VALORIZACION,
	type EstadoValorizacion,
	ETIQUETA_ESTADO_VALORIZACION,
	formatearPeriodo,
} from "./domain/valorizacion";
import { EstadoValorizacionPill } from "./ui/EstadoValorizacionPill";

interface FilaValorizacion {
	id: string;
	numero: string;
	periodo: string;
	contrato: string;
	proyecto: string;
	proveedor: string;
	estado: EstadoValorizacion;
	moneda: "USD" | "PEN";
}

const columnHelper = crearColumnas<FilaValorizacion>();

export function ValorizacionesPage() {
	const navigate = useNavigate();
	const [busqueda, setBusqueda] = useState("");
	const filas = useLiveQuery(async (): Promise<FilaValorizacion[]> => {
		const [valorizaciones, contratos, terceros] = await Promise.all([
			valorizacionService.listar(),
			contratoRepository.listar(),
			terceroRepository.listar(),
		]);
		const porContrato = new Map(contratos.map((contrato) => [contrato.id, contrato]));
		const nombres = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]));

		return valorizaciones.map((valorizacion) => {
			const contrato = porContrato.get(valorizacion.contratoId);

			return {
				id: valorizacion.id,
				numero: valorizacion.numero ?? "—",
				periodo: valorizacion.periodo,
				contrato: contrato?.codigo ?? "—",
				proyecto: contrato?.proyecto ?? "—",
				proveedor: (contrato && nombres.get(contrato.terceroId)) ?? "—",
				estado: valorizacion.estado,
				moneda: valorizacion.moneda,
			};
		});
	});

	const abrir = (id: string) => void navigate(`/valorizaciones/${id}`);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("numero", {
					header: "N.° val.",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap tabular-nums" },
				}),
				columnHelper.accessor("periodo", {
					header: "Periodo",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap" },
					cell: ({ getValue }) => formatearPeriodo(getValue()),
				}),
				columnHelper.accessor("contrato", {
					header: "Contrato",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, celda: "whitespace-nowrap tabular-nums" },
				}),
				columnHelper.accessor("proyecto", {
					header: "Proyecto",
					filterFn: "contiene",
					meta: {
						filtro: { tipo: "texto" },
						alineacion: "izquierda",
						celda: "min-w-44 font-medium text-navy-900",
					},
				}),
				columnHelper.accessor("proveedor", {
					header: "Proveedor",
					filterFn: "contiene",
					meta: { filtro: { tipo: "texto" }, alineacion: "izquierda", celda: "min-w-40" },
				}),
				columnHelper.accessor("estado", {
					header: "Estado",
					filterFn: "igual",
					meta: {
						filtro: {
							tipo: "opciones",
							opciones: ESTADOS_VALORIZACION.map((estado) => ({
								valor: estado,
								etiqueta: ETIQUETA_ESTADO_VALORIZACION[estado],
							})),
						},
					},
					cell: ({ getValue }) => <EstadoValorizacionPill estado={getValue()} />,
				}),
				columnHelper.display({
					id: "acciones",
					meta: { celda: "w-24" },
					cell: ({ row }) => (
						<AccionesFila
							acciones={[
								row.original.estado === "BORRADOR"
									? {
											tipo: "editar",
											etiqueta: `Continuar ${formatearPeriodo(row.original.periodo)} de ${row.original.contrato}`,
											onClick: () => abrir(row.original.id),
										}
									: {
											tipo: "ver",
											etiqueta: `Ver ${row.original.numero}`,
											onClick: () => abrir(row.original.id),
										},
							]}
						/>
					),
				}),
			]),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const filtradas = (filas ?? []).filter((fila) =>
		coincide(busqueda, [
			fila.numero,
			fila.contrato,
			fila.proyecto,
			fila.proveedor,
			formatearPeriodo(fila.periodo),
		]),
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Valorizaciones"
				description="Borradores en curso y valorizaciones emitidas, por periodo."
				actions={<NuevaValorizacionButton className="md:hidden" />}
			/>
			{filas === undefined ? (
				<Skeleton aria-label="Cargando" className="h-72 w-full rounded-xl" />
			) : filas.length === 0 ? (
				<EmptyState
					icon={ClipboardList}
					title="No hay valorizaciones"
					description="Crea la primera con «Nueva valorización»: eliges el contrato, el periodo y cargas las horas."
				/>
			) : (
				<>
					<div className="hidden md:block">
						<DataTable
							data={filas}
							columns={columns}
							initialSorting={[{ id: "periodo", desc: true }]}
							nuevo={{ label: "Nueva", onClick: () => void navigate("/valorizaciones/nueva") }}
							vacio={<span className="text-muted-foreground">No hay valorizaciones.</span>}
						/>
					</div>
					<div className="md:hidden">
						<ListCard
							busqueda={busqueda}
							onBusquedaChange={setBusqueda}
							placeholder="Buscar por contrato, proyecto o periodo"
							total={filas.length}
							visibles={filtradas.length}
						>
							<ul className="divide-y divide-navy-100">
								{filtradas.map((fila) => (
									<li key={fila.id}>
										<button
											type="button"
											onClick={() => abrir(fila.id)}
											className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left"
										>
											<span className="flex items-start justify-between gap-3">
												<span className="font-medium text-navy-900">
													{formatearPeriodo(fila.periodo)}
												</span>
												<EstadoValorizacionPill estado={fila.estado} />
											</span>
											<span className="text-[13px] text-muted-foreground">
												{fila.contrato} · {fila.proyecto}
											</span>
											<span className="text-[13px] text-navy-600">{fila.proveedor}</span>
										</button>
									</li>
								))}
							</ul>
						</ListCard>
					</div>
				</>
			)}
		</div>
	);
}
