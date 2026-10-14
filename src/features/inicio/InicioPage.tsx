import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import {
	Building2,
	ChevronRight,
	CircleCheck,
	ClipboardList,
	FilePen,
	FileSignature,
	HandCoins,
	type LucideIcon,
	TriangleAlert,
	Truck,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { hoyIso } from "@/features/contratos/domain/contrato";
import { valorizacionService } from "@/features/valorizaciones/application/valorizacionService.instance";
import { formatearPeriodo } from "@/features/valorizaciones/domain/valorizacion";
import { EstadoValorizacionPill } from "@/features/valorizaciones/ui/EstadoValorizacionPill";
import { formatearMoneda, type Moneda } from "@/lib/dinero";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/EmptyState";
import { NuevaValorizacionButton } from "@/shared/components/NuevaValorizacionButton";
import { PageHeader } from "@/shared/components/PageHeader";

import { type ContratoEnAlerta, resumenInicio, UMBRAL_AVANCE } from "./domain/resumen";

const tarjeta =
	"overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card";

function Indicador({
	label,
	to,
	icon: Icon,
	tone,
	children,
}: {
	label: string;
	to: string;
	icon: LucideIcon;
	tone: string;
	children: ReactNode;
}) {
	return (
		<Link
			to={to}
			className={cn(
				tarjeta,
				"flex flex-col gap-3 p-4 transition-shadow hover:shadow-md hover:shadow-navy-900/5 md:p-5",
			)}
		>
			<span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}>
				<Icon className="size-[18px]" aria-hidden="true" />
			</span>
			<span className="flex flex-col gap-0.5">
				<span className="text-xl font-semibold tracking-tight text-navy-900 tabular-nums md:text-2xl dark:text-white">
					{children}
				</span>
				<span className="text-[13px] text-muted-foreground">{label}</span>
			</span>
		</Link>
	);
}

function Seccion({
	id,
	titulo,
	accion,
	children,
}: {
	id: string;
	titulo: string;
	accion?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className={tarjeta}>
			<div className="flex items-center justify-between border-b border-navy-100 px-4 py-3.5 md:px-5">
				<h2 id={id} className="text-sm font-semibold text-navy-900 dark:text-white">
					{titulo}
				</h2>
				{accion}
			</div>
			{children}
		</section>
	);
}

function FilaAlerta({ alerta }: { alerta: ContratoEnAlerta }) {
	const { contrato, cliente, valorizado, avancePct, nivel } = alerta;
	const excedido = nivel === "excedido";

	return (
		<li>
			<Link
				to={`/contratos/${contrato.id}`}
				className="flex flex-col gap-2 px-4 py-3.5 hover:bg-navy-50/60 md:px-5"
			>
				<span className="flex items-start justify-between gap-3">
					<span className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate font-medium text-navy-900">
							{contrato.codigo} · {contrato.proyecto}
						</span>
						<span className="truncate text-[13px] text-muted-foreground">{cliente}</span>
					</span>
					<span
						className={cn(
							"flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
							excedido ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800",
						)}
					>
						<TriangleAlert className="size-3.5" aria-hidden="true" />
						{avancePct.toLocaleString("es-PE")} %
					</span>
				</span>
				<span
					role="progressbar"
					aria-label={`Avance de ${contrato.codigo}`}
					aria-valuenow={avancePct}
					aria-valuemin={0}
					aria-valuemax={100}
					className="h-1.5 overflow-hidden rounded-full bg-navy-100"
				>
					<span
						className={cn("block h-full rounded-full", excedido ? "bg-red-500" : "bg-amber-500")}
						style={{ width: `${Math.min(avancePct, 100)}%` }}
					/>
				</span>
				<span className="text-[13px] text-muted-foreground tabular-nums">
					{excedido ? "Excedido: " : "Por agotarse: "}
					{formatearMoneda(valorizado, contrato.moneda)} de{" "}
					{formatearMoneda(contrato.montoContractual, contrato.moneda)}
				</span>
			</Link>
		</li>
	);
}

function montosDelMes(valorizado: Partial<Record<Moneda, number>>): ReactNode {
	const monedas = (Object.keys(valorizado) as Moneda[]).filter((moneda) => valorizado[moneda]);
	if (monedas.length === 0) {
		return formatearMoneda(0, "USD");
	}

	return monedas.map((moneda) => (
		<span key={moneda} className="block">
			{formatearMoneda(valorizado[moneda] ?? 0, moneda)}
		</span>
	));
}

export function InicioPage() {
	const { user } = useSession();
	const firstName = user?.name.split(" ")[0] ?? "";
	const fecha = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
	const datos = useLiveQuery(async () => {
		const [terceros, contratos, contratoEquipos, valorizaciones] = await Promise.all([
			terceroRepository.listar(),
			contratoRepository.listar(),
			contratoRepository.todosLosEquipos(),
			valorizacionService.listar(),
		]);

		return {
			resumen: resumenInicio({
				terceros,
				contratos,
				contratoEquipos,
				valorizaciones,
				hoy: hoyIso(),
			}),
			contratos: new Map(contratos.map((contrato) => [contrato.id, contrato])),
		};
	});

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={`Hola, ${firstName}`}
				description={`Resumen de la operación al ${fecha}.`}
				actions={<NuevaValorizacionButton className="md:hidden" />}
			/>

			{datos === undefined ? (
				<Skeleton aria-label="Cargando" className="h-80 w-full rounded-xl" />
			) : (
				<>
					<section
						aria-label="Indicadores"
						className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4"
					>
						<Indicador
							label="Por cobrar este mes"
							to="/valorizaciones"
							icon={Wallet}
							tone="bg-brand-50 text-brand-600"
						>
							{montosDelMes(datos.resumen.porCobrarMes)}
						</Indicador>
						<Indicador
							label="Por pagar este mes"
							to="/valorizaciones"
							icon={HandCoins}
							tone="bg-amber-50 text-amber-700"
						>
							{montosDelMes(datos.resumen.porPagarMes)}
						</Indicador>
						<Indicador
							label="Contratos activos"
							to="/contratos"
							icon={FileSignature}
							tone="bg-indigo-50 text-indigo-600"
						>
							{datos.resumen.contratosActivos}
						</Indicador>
						<Indicador
							label="Equipos en obra"
							to="/equipos"
							icon={Truck}
							tone="bg-emerald-50 text-emerald-600"
						>
							{datos.resumen.equiposEnObra}
						</Indicador>
						<Indicador
							label="Clientes activos"
							to="/clientes"
							icon={Building2}
							tone="bg-sky-50 text-sky-600"
						>
							{datos.resumen.clientesActivos}
						</Indicador>
					</section>

					<div className="grid gap-6 lg:grid-cols-2">
						<Seccion id="atencion" titulo="Contratos que requieren atención">
							{datos.resumen.alertas.length === 0 ? (
								<p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5">
									<CircleCheck className="size-5 text-emerald-600" aria-hidden="true" />
									Ningún contrato supera el {UMBRAL_AVANCE} % de lo contratado.
								</p>
							) : (
								<ul className="divide-y divide-navy-100">
									{datos.resumen.alertas.map((alerta) => (
										<FilaAlerta key={alerta.contrato.id} alerta={alerta} />
									))}
								</ul>
							)}
						</Seccion>

						<Seccion id="borradores" titulo="Borradores pendientes">
							{datos.resumen.borradores.length === 0 ? (
								<p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground md:px-5">
									<CircleCheck className="size-5 text-emerald-600" aria-hidden="true" />
									No hay valorizaciones por terminar.
								</p>
							) : (
								<ul className="divide-y divide-navy-100">
									{datos.resumen.borradores.map((borrador) => {
										const contrato = datos.contratos.get(borrador.contratoId);

										return (
											<li key={borrador.id}>
												<Link
													to={`/valorizaciones/${borrador.id}`}
													className="flex items-center gap-3 px-4 py-3.5 hover:bg-navy-50/60 md:px-5"
												>
													<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
														<FilePen className="size-[18px]" aria-hidden="true" />
													</span>
													<span className="flex min-w-0 flex-1 flex-col gap-0.5">
														<span className="font-medium text-navy-900">
															{formatearPeriodo(borrador.periodo)}
														</span>
														<span className="truncate text-[13px] text-muted-foreground">
															{contrato ? `${contrato.codigo} · ${contrato.proyecto}` : "—"}
														</span>
													</span>
													<span className="text-sm font-medium text-brand-600">Continuar</span>
													<ChevronRight className="size-4 text-navy-400" aria-hidden="true" />
												</Link>
											</li>
										);
									})}
								</ul>
							)}
						</Seccion>
					</div>

					<Seccion
						id="recientes"
						titulo="Valorizaciones recientes"
						accion={
							<Link
								to="/valorizaciones"
								className="text-sm font-medium text-brand-600 hover:underline"
							>
								Ver todas
							</Link>
						}
					>
						{datos.resumen.ultimasEmitidas.length === 0 ? (
							<EmptyState
								icon={ClipboardList}
								title="Sin valorizaciones"
								description="Las valorizaciones que emitas aparecerán aquí con su número, periodo y monto."
								className="rounded-none border-0"
							/>
						) : (
							<ul className="divide-y divide-navy-100">
								{datos.resumen.ultimasEmitidas.map((valorizacion) => {
									const contrato = datos.contratos.get(valorizacion.contratoId);

									return (
										<li key={valorizacion.id}>
											<Link
												to={`/valorizaciones/${valorizacion.id}`}
												className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-navy-50/60 md:grid-cols-[7rem_1fr_9rem_9rem_7rem] md:px-5"
											>
												<span className="font-medium text-brand-700 tabular-nums">
													{valorizacion.numero}
												</span>
												<span className="truncate text-sm text-navy-700 max-md:order-3 max-md:col-span-2">
													{contrato ? `${contrato.codigo} · ${contrato.proyecto}` : "—"}
												</span>
												<span className="text-sm text-navy-600 max-md:hidden">
													{formatearPeriodo(valorizacion.periodo)}
												</span>
												<span className="text-right text-sm font-semibold text-navy-900 tabular-nums max-md:order-2">
													{valorizacion.totales
														? formatearMoneda(valorizacion.totales.total, valorizacion.moneda)
														: "—"}
												</span>
												<span className="justify-self-end max-md:hidden">
													<EstadoValorizacionPill estado={valorizacion.estado} />
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</Seccion>
				</>
			)}
		</div>
	);
}
