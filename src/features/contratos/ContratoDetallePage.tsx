import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChevronRight, ClipboardList, FileSignature, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { equipoRepository } from "@/features/equipos/application/equipoService.instance";
import { type Equipo, nombreEquipo } from "@/features/equipos/domain/equipo";
import { valorizacionRepository } from "@/features/valorizaciones/application/valorizacionService.instance";
import { formatearPeriodo } from "@/features/valorizaciones/domain/valorizacion";
import { EstadoValorizacionPill } from "@/features/valorizaciones/ui/EstadoValorizacionPill";
import { formatearMoneda } from "@/lib/dinero";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/EmptyState";

import { contratoService } from "./application/contratoService.instance";
import {
	type Contrato,
	type ContratoEquipo,
	estadoContrato,
	hoyIso,
	parcialEquipo,
} from "./domain/contrato";
import { ContratoFormDialog } from "./ui/ContratoFormDialog";
import { EstadoContratoPill } from "./ui/EstadoContratoPill";
import { vigencia } from "./ui/vigencia";

const tarjeta =
	"overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card";
const formatoHoras = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

function Dato({ label, children }: { label: string; children: string | undefined }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-[13px] text-muted-foreground">{label}</dt>
			<dd className="text-sm font-medium text-navy-900">
				{children === undefined || children === "" ? (
					<span className="text-navy-300">—</span>
				) : (
					children
				)}
			</dd>
		</div>
	);
}

function Indicadores({ contrato, valorizado }: { contrato: Contrato; valorizado: number }) {
	// Valorizado = suma de los subtotales (sin IGV) de las valorizaciones emitidas.
	const avance =
		contrato.montoContractual === 0
			? 0
			: Math.round((valorizado / contrato.montoContractual) * 10000) / 100;
	const indicadores = [
		{
			label: "Monto contractual",
			value: formatearMoneda(contrato.montoContractual, contrato.moneda),
		},
		{ label: "Valorizado acumulado", value: formatearMoneda(valorizado, contrato.moneda) },
		{
			label: "Saldo contractual",
			value: formatearMoneda(contrato.montoContractual - valorizado, contrato.moneda),
		},
		{ label: "Avance", value: `${avance.toLocaleString("es-PE")} %` },
	];

	return (
		<section
			aria-label="Resumen del contrato"
			className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
		>
			{indicadores.map(({ label, value }) => (
				<div key={label} className={cn(tarjeta, "flex flex-col gap-1 p-4 md:p-5")}>
					<span className="text-[13px] text-muted-foreground">{label}</span>
					<span className="text-lg font-semibold tracking-tight text-navy-900 tabular-nums md:text-xl">
						{value}
					</span>
				</div>
			))}
		</section>
	);
}

function TablaEquipos({
	contrato,
	filas,
	equipos,
}: {
	contrato: Contrato;
	filas: ContratoEquipo[];
	equipos: Map<string, Equipo>;
}) {
	return (
		<section aria-labelledby="equipos-detalle" className={tarjeta}>
			<h2
				id="equipos-detalle"
				className="border-b border-navy-100 px-5 py-4 text-sm font-semibold text-navy-900 md:px-6"
			>
				Equipos del contrato
			</h2>
			<table className="hidden w-full text-sm md:table">
				<thead className="bg-navy-50 text-xs text-muted-foreground">
					<tr>
						<th className="px-6 py-2.5 text-left font-medium">Equipo</th>
						<th className="px-3 py-2.5 text-right font-medium">Horas mínimas</th>
						<th className="px-3 py-2.5 text-right font-medium">Costo por hora</th>
						<th className="px-6 py-2.5 text-right font-medium">Parcial</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-navy-100 text-navy-700">
					{filas.map((fila) => {
						const equipo = equipos.get(fila.equipoId);

						return (
							<tr key={fila.id}>
								<td className="px-6 py-3">
									<span className="font-medium text-navy-900">
										{equipo ? nombreEquipo(equipo) : "Equipo no encontrado"}
									</span>
									{equipo && (
										<span className="block text-xs text-muted-foreground">
											{equipo.activoFijo}
											{equipo.placa ? ` · Placa ${equipo.placa}` : ""}
										</span>
									)}
								</td>
								<td className="px-3 py-3 text-right tabular-nums">
									{formatoHoras.format(Number(fila.horasMinimas))} h
								</td>
								<td className="px-3 py-3 text-right tabular-nums">
									{formatearMoneda(fila.costoHora, contrato.moneda)}
								</td>
								<td className="px-6 py-3 text-right font-medium text-navy-900 tabular-nums">
									{formatearMoneda(parcialEquipo(fila), contrato.moneda)}
								</td>
							</tr>
						);
					})}
				</tbody>
				<tfoot>
					<tr className="border-t border-navy-100 bg-navy-50/60">
						<td colSpan={3} className="px-6 py-3 text-right text-sm text-muted-foreground">
							Monto contractual
						</td>
						<td className="px-6 py-3 text-right text-base font-semibold text-navy-900 tabular-nums">
							{formatearMoneda(contrato.montoContractual, contrato.moneda)}
						</td>
					</tr>
				</tfoot>
			</table>
			<ul className="divide-y divide-navy-100 md:hidden">
				{filas.map((fila) => {
					const equipo = equipos.get(fila.equipoId);

					return (
						<li key={fila.id} className="flex flex-col gap-1 px-5 py-3.5">
							<span className="font-medium text-navy-900">
								{equipo ? nombreEquipo(equipo) : "Equipo no encontrado"}
							</span>
							<span className="flex items-baseline justify-between text-[13px] text-muted-foreground tabular-nums">
								<span>
									{formatoHoras.format(Number(fila.horasMinimas))} h ×{" "}
									{formatearMoneda(fila.costoHora, contrato.moneda)}
								</span>
								<span className="font-semibold text-navy-900">
									{formatearMoneda(parcialEquipo(fila), contrato.moneda)}
								</span>
							</span>
						</li>
					);
				})}
				<li className="flex items-baseline justify-between bg-navy-50/60 px-5 py-3">
					<span className="text-sm text-muted-foreground">Monto contractual</span>
					<span className="font-semibold text-navy-900 tabular-nums">
						{formatearMoneda(contrato.montoContractual, contrato.moneda)}
					</span>
				</li>
			</ul>
		</section>
	);
}

export function ContratoDetallePage() {
	const { id = "" } = useParams();
	const [editando, setEditando] = useState(false);
	const datos = useLiveQuery(async () => {
		const detalle = await contratoService.obtenerDetalle(id);
		if (!detalle) {
			return { detalle: null };
		}
		const [cliente, equipos, terceros, valorizaciones] = await Promise.all([
			terceroRepository.obtener(detalle.contrato.terceroId),
			equipoRepository.listar(),
			terceroRepository.listar(),
			valorizacionRepository.delContrato(id),
		]);

		return {
			detalle,
			cliente,
			listaEquipos: equipos,
			valorizaciones: valorizaciones.sort((a, b) => b.periodo.localeCompare(a.periodo)),
			equipos: new Map(equipos.map((equipo) => [equipo.id, equipo])),
			// Clientes activos, más el del contrato aunque se haya desactivado.
			clientes: terceros.filter(
				(tercero) => tercero.estado === "ACTIVO" || tercero.id === detalle.contrato.terceroId,
			),
		};
	}, [id]);

	if (datos === undefined) {
		return <Skeleton aria-label="Cargando" className="h-96 w-full rounded-xl" />;
	}

	if (datos.detalle === null) {
		return (
			<EmptyState
				icon={FileSignature}
				title="Contrato no encontrado"
				description="Puede que se haya eliminado."
			>
				<Link to="/contratos" className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}>
					Ver contratos
				</Link>
			</EmptyState>
		);
	}

	const { contrato, equipos: filas } = datos.detalle;
	const detalle = datos.detalle;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<Link
					to="/contratos"
					className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-900"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Contratos
				</Link>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1.5">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-medium text-brand-700 tabular-nums">
								{contrato.codigo}
							</span>
							<EstadoContratoPill estado={estadoContrato(contrato, hoyIso())} />
						</div>
						<h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">
							{contrato.proyecto}
						</h1>
						<p className="text-sm text-muted-foreground">
							{datos.cliente?.razonSocial ?? "Cliente no encontrado"} · {vigencia(contrato)}
						</p>
					</div>
					<Button variant="outline" className="h-9 w-fit px-3.5" onClick={() => setEditando(true)}>
						<Pencil />
						Editar
					</Button>
				</div>
			</div>

			<Indicadores
				contrato={contrato}
				valorizado={datos.valorizaciones
					.filter((valorizacion) => valorizacion.estado === "EMITIDA")
					.reduce((suma, valorizacion) => suma + (valorizacion.totales?.subtotal1 ?? 0), 0)}
			/>

			<section aria-labelledby="datos-contrato" className={tarjeta}>
				<h2
					id="datos-contrato"
					className="border-b border-navy-100 px-5 py-4 text-sm font-semibold text-navy-900 md:px-6"
				>
					Datos del contrato
				</h2>
				<dl className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
					<Dato label="Cliente">{datos.cliente?.razonSocial}</Dato>
					<Dato label="RUC">{datos.cliente?.ruc}</Dato>
					<Dato label="Proyecto">{contrato.proyecto}</Dato>
					<Dato label="Ubicación">{contrato.ubicacion}</Dato>
					<Dato label="Vigencia">{vigencia(contrato)}</Dato>
					<Dato label="Moneda">{contrato.moneda}</Dato>
					<Dato label="Fondo de garantía">
						{contrato.fondoGarantiaPct > 0
							? `${contrato.fondoGarantiaPct.toLocaleString("es-PE")} %`
							: "No aplica"}
					</Dato>
					<Dato label="N.° de documento">{contrato.documentoContractual}</Dato>
					{contrato.observaciones && (
						<div className="sm:col-span-2 lg:col-span-4">
							<Dato label="Observaciones">{contrato.observaciones}</Dato>
						</div>
					)}
				</dl>
			</section>

			<TablaEquipos contrato={contrato} filas={filas} equipos={datos.equipos} />

			<section aria-labelledby="valorizaciones-contrato" className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<h2 id="valorizaciones-contrato" className="text-sm font-semibold text-navy-900">
						Valorizaciones
					</h2>
					<Link
						to={`/valorizaciones/nueva?contrato=${contrato.id}`}
						className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}
					>
						<Plus />
						Nueva valorización
					</Link>
				</div>
				{datos.valorizaciones.length === 0 ? (
					<EmptyState
						icon={ClipboardList}
						title="Sin valorizaciones"
						description="Las valorizaciones de este contrato aparecerán aquí con su periodo y estado."
					/>
				) : (
					<ul className={cn(tarjeta, "divide-y divide-navy-100")}>
						{datos.valorizaciones.map((valorizacion) => (
							<li key={valorizacion.id}>
								<Link
									to={`/valorizaciones/${valorizacion.id}`}
									className="flex items-center gap-3 px-5 py-3.5 hover:bg-navy-50/60"
								>
									<span className="flex flex-1 flex-col gap-0.5">
										<span className="font-medium text-navy-900">
											{formatearPeriodo(valorizacion.periodo)}
										</span>
										<span className="text-[13px] text-muted-foreground tabular-nums">
											{valorizacion.numero ?? "Sin número"}
										</span>
									</span>
									<EstadoValorizacionPill estado={valorizacion.estado} />
									<ChevronRight className="size-4 text-navy-400" aria-hidden="true" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<ContratoFormDialog
				open={editando}
				onOpenChange={setEditando}
				detalle={detalle}
				clientes={datos.clientes}
				equipos={datos.listaEquipos}
			/>
		</div>
	);
}
