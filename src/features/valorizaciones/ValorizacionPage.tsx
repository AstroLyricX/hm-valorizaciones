import { useLiveQuery } from "dexie-react-hooks";
import {
	ArrowLeft,
	Ban,
	CircleAlert,
	ClipboardList,
	CloudCheck,
	LoaderCircle,
	Lock,
	Send,
	Trash2,
	TriangleAlert,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { formatearMoneda } from "@/lib/dinero";
import { formatearFechaNumerica } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EmptyState } from "@/shared/components/EmptyState";

import type { Planilla } from "./application/ValorizacionService";
import { valorizacionService } from "./application/valorizacionService.instance";
import { montoEnLetras } from "./domain/montoEnLetras";
import {
	calcularValorizacion,
	CantidadSchema,
	formatearPeriodo,
	type ValorizacionCabecera,
} from "./domain/valorizacion";
import { AccionesPdf } from "./ui/AccionesPdf";
import { AnularDialog } from "./ui/AnularDialog";
import { DatosServicio } from "./ui/DatosServicio";
import { EstadoValorizacionPill } from "./ui/EstadoValorizacionPill";
import { horas } from "./ui/formato";
import { PlanillaMedicion } from "./ui/PlanillaMedicion";
import { type EstadoGuardado, useAutoguardado } from "./ui/useAutoguardado";

const tarjeta =
	"overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card";
const CABECERA = "cabecera";

function Tarjeta({
	titulo,
	children,
	className,
}: {
	titulo: string;
	children: ReactNode;
	className?: string;
}) {
	const id = `tarjeta-${titulo.toLowerCase().replaceAll(" ", "-")}`;

	return (
		<section aria-labelledby={id} className={cn(tarjeta, className)}>
			<h2
				id={id}
				className="border-b border-navy-100 px-5 py-3.5 text-sm font-semibold text-navy-900"
			>
				{titulo}
			</h2>
			{children}
		</section>
	);
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid grid-cols-[8.5rem_1fr] gap-2 text-[13px]">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="font-medium text-navy-900">{children === "" ? "—" : children}</dd>
		</div>
	);
}

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
	if (estado === "pendiente") {
		return (
			<span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
				<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
				Guardando…
			</span>
		);
	}
	if (estado === "error") {
		return (
			<span className="flex items-center gap-1.5 text-[13px] text-destructive">
				<CircleAlert className="size-4" aria-hidden="true" />
				No se pudo guardar
			</span>
		);
	}

	return (
		<span className="flex items-center gap-1.5 text-[13px] text-emerald-700">
			<CloudCheck className="size-4" aria-hidden="true" />
			Guardado en este equipo
		</span>
	);
}

function combinar(...estados: EstadoGuardado[]): EstadoGuardado {
	if (estados.includes("error")) {
		return "error";
	}

	return estados.includes("pendiente") ? "pendiente" : "guardado";
}

function Editor({ planilla }: { planilla: Planilla }) {
	const { user } = useSession();
	const usuario = user?.email ?? "desconocido";
	const navigate = useNavigate();
	const { valorizacion, contrato, proveedor, empresa, filas } = planilla;
	const editable = valorizacion.estado === "BORRADOR";
	const [descartando, setDescartando] = useState(false);
	const [emitiendo, setEmitiendo] = useState(false);
	const [anulando, setAnulando] = useState(false);
	const puedeAnular = user?.rol === "ADMIN" && valorizacion.estado === "EMITIDA";
	// Solo los campos editables: el resto (número, estado…) siempre sale de la valorización guardada.
	const [cabecera, setCabecera] = useState<ValorizacionCabecera>(() => ({
		nombreServicio: valorizacion.nombreServicio,
		plazoPago: valorizacion.plazoPago,
		gastosGeneralesPct: valorizacion.gastosGeneralesPct,
		utilidadPct: valorizacion.utilidadPct,
		observaciones: valorizacion.observaciones,
	}));
	// Las horas viven en la pantalla mientras se escriben; se guardan solas tras una pausa.
	const [cantidades, setCantidades] = useState<Record<string, string>>(() =>
		Object.fromEntries(filas.map((fila) => [fila.contratoEquipoId, fila.cantidadActual])),
	);
	const hayErrores = Object.values(cantidades).some(
		(valor) => !CantidadSchema.safeParse(valor).success,
	);
	const errores = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(cantidades).map(([id, valor]) => [
					id,
					CantidadSchema.safeParse(valor).success
						? undefined
						: "Ingresa las horas, por ejemplo 53.23.",
				]),
			),
		[cantidades],
	);

	const horasGuardado = useAutoguardado(
		useCallback(
			async (contratoEquipoId: string, valor: string) =>
				valorizacionService.actualizarCantidad(valorizacion.id, contratoEquipoId, valor, usuario),
			[valorizacion.id, usuario],
		),
	);
	const cabeceraGuardado = useAutoguardado(
		useCallback(
			async (_clave: string, valor: string) => {
				await valorizacionService.actualizarCabecera(
					valorizacion.id,
					JSON.parse(valor) as ValorizacionCabecera,
					usuario,
				);
			},
			[valorizacion.id, usuario],
		),
	);

	const calculo = calcularValorizacion(
		filas.map((fila) => ({
			cantidadContractual: fila.cantidadContractual,
			precioUnitario: fila.precioUnitario,
			cantidadAnterior: fila.cantidadAnterior,
			cantidadActual: cantidades[fila.contratoEquipoId] ?? "0",
		})),
		{
			gastosGeneralesPct: cabecera.gastosGeneralesPct,
			utilidadPct: cabecera.utilidadPct,
			igvPct: valorizacion.igvPct,
			fondoGarantiaPct: valorizacion.fondoGarantiaPct,
		},
	);
	const moneda = valorizacion.moneda;
	// El PDF usa lo que se ve en pantalla, aunque el guardado automático aún esté pendiente.
	const datosPdf = {
		planilla: {
			...planilla,
			valorizacion: { ...valorizacion, ...cabecera },
			filas: filas.map((fila) => ({
				...fila,
				cantidadActual: CantidadSchema.safeParse(cantidades[fila.contratoEquipoId]).success
					? (cantidades[fila.contratoEquipoId] ?? fila.cantidadActual)
					: "0",
			})),
		},
		calculo,
	};
	const excedidos = filas.filter((_, indice) => calculo.items[indice].exceso !== "0");

	const cambiarCantidad = (contratoEquipoId: string, valor: string) => {
		setCantidades((actual) => ({ ...actual, [contratoEquipoId]: valor }));
		if (CantidadSchema.safeParse(valor).success) {
			horasGuardado.programar(contratoEquipoId, valor);
		}
	};

	const indicadores = [
		{ label: "Monto contractual", value: formatearMoneda(contrato.montoContractual, moneda) },
		{ label: "Total del periodo", value: formatearMoneda(calculo.actual.total, moneda) },
		{ label: "Acumulado (sin IGV)", value: formatearMoneda(calculo.acumulado.subtotal1, moneda) },
		{
			label: "Saldo contractual",
			value: formatearMoneda(calculo.saldoContractual, moneda),
			alerta: calculo.saldoContractual < 0,
		},
		{
			label: "Avance",
			value: `${calculo.avancePct.toLocaleString("es-PE")} %`,
			alerta: calculo.excede,
		},
	];

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3">
				<Link
					to="/valorizaciones"
					className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-900"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Valorizaciones
				</Link>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1.5">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-medium text-brand-700 tabular-nums">
								{valorizacion.numero ?? "Sin número"}
							</span>
							<EstadoValorizacionPill estado={valorizacion.estado} />
						</div>
						<h1 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-white">
							Valorización · {formatearPeriodo(valorizacion.periodo)}
						</h1>
						<p className="text-sm text-muted-foreground">
							{contrato.codigo} · {contrato.proyecto} ·{" "}
							{proveedor?.razonSocial ?? "Proveedor no encontrado"}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						{editable && (
							<IndicadorGuardado estado={combinar(horasGuardado.estado, cabeceraGuardado.estado)} />
						)}
						<AccionesPdf datos={datosPdf} />
						{editable && (
							<>
								<Button
									variant="outline"
									className="h-9 border-red-200 px-3.5 text-red-600 hover:bg-red-50 hover:text-red-700"
									onClick={() => setDescartando(true)}
								>
									<Trash2 />
									Descartar
								</Button>
								<Button
									className="h-9 bg-brand-600 px-3.5 hover:bg-brand-700"
									disabled={hayErrores}
									onClick={() => {
										if (calculo.actual.subtotal1 === 0) {
											toast.warning("Ingresa las horas de al menos un equipo antes de emitir.");

											return;
										}
										setEmitiendo(true);
									}}
								>
									<Send />
									Emitir valorización
								</Button>
							</>
						)}
						{puedeAnular && (
							<Button
								variant="outline"
								className="h-9 border-red-200 px-3.5 text-red-600 hover:bg-red-50 hover:text-red-700"
								onClick={() => setAnulando(true)}
							>
								<Ban />
								Anular
							</Button>
						)}
					</div>
				</div>
			</div>

			{valorizacion.estado === "ANULADA" && (
				<div
					role="status"
					className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
				>
					<Ban className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold">
							Anulada el{" "}
							{valorizacion.anuladaEn
								? formatearFechaNumerica(valorizacion.anuladaEn.slice(0, 10))
								: "—"}
						</span>
						<span>Motivo: {valorizacion.motivoAnulacion}</span>
					</div>
				</div>
			)}
			{!editable && valorizacion.fechaEmision && (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Lock className="size-4" aria-hidden="true" />
					Emitida el {formatearFechaNumerica(valorizacion.fechaEmision)}. Sus horas y montos ya no
					se modifican.
				</p>
			)}

			<section
				aria-label="Resumen de la valorización"
				className="grid grid-cols-2 gap-3 lg:grid-cols-5"
			>
				{indicadores.map(({ label, value, alerta }) => (
					<div key={label} className={cn(tarjeta, "flex flex-col gap-1 p-4")}>
						<span className="text-[13px] text-muted-foreground">{label}</span>
						<span
							className={cn(
								"text-lg font-semibold tracking-tight tabular-nums",
								alerta ? "text-amber-700" : "text-navy-900",
							)}
						>
							{value}
						</span>
					</div>
				))}
			</section>

			{excedidos.length > 0 && (
				<div
					role="alert"
					className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					<TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold">Lo valorizado supera las horas contratadas</span>
						<span>
							{excedidos
								.map((fila) => {
									const indice = filas.indexOf(fila);

									return `${fila.descripcion}: ${horas(calculo.items[indice].cantidadAcumulada)} h de ${horas(fila.cantidadContractual)} h`;
								})
								.join(" · ")}
							. Revisa las horas antes de emitir.
						</span>
					</div>
				</div>
			)}

			<Tarjeta titulo="Planilla de medición">
				<PlanillaMedicion
					filas={filas}
					cantidades={cantidades}
					errores={errores}
					onCantidad={cambiarCantidad}
					calculo={calculo}
					moneda={moneda}
					parametros={{
						gastosGeneralesPct: cabecera.gastosGeneralesPct,
						utilidadPct: cabecera.utilidadPct,
						igvPct: valorizacion.igvPct,
					}}
					editable={editable}
				/>
			</Tarjeta>

			<div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
				<Tarjeta titulo="Datos del servicio">
					<div className="px-5 py-5">
						<DatosServicio
							valorizacion={valorizacion}
							editable={editable}
							onCambio={(datos) => {
								setCabecera(datos);
								cabeceraGuardado.programar(CABECERA, JSON.stringify(datos));
							}}
						/>
					</div>
				</Tarjeta>
				<Tarjeta titulo="Pago del periodo">
					<dl className="flex flex-col gap-2.5 px-5 py-5 text-sm tabular-nums">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Total de la factura</dt>
							<dd className="font-medium text-navy-900">
								{formatearMoneda(calculo.actual.total, moneda)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">
								Fondo de garantía ({valorizacion.fondoGarantiaPct.toLocaleString("es-PE")} %)
							</dt>
							<dd className="font-medium text-navy-900">
								− {formatearMoneda(calculo.fondoGarantia, moneda)}
							</dd>
						</div>
						<div className="flex justify-between border-t border-navy-100 pt-2.5 text-base">
							<dt className="font-semibold text-navy-900">Neto a pagar</dt>
							<dd aria-label="Neto a pagar" className="font-semibold text-brand-700">
								{formatearMoneda(calculo.netoPagable, moneda)}
							</dd>
						</div>
						<div className="flex flex-col gap-1 border-t border-navy-100 pt-2.5 font-sans">
							<dt className="text-xs font-medium text-muted-foreground">
								Son (total de la factura)
							</dt>
							<dd className="text-[13px] font-medium text-navy-900">
								{valorizacion.montoEnLetras ?? montoEnLetras(calculo.actual.total, moneda)}
							</dd>
						</div>
					</dl>
				</Tarjeta>
			</div>

			<Tarjeta titulo="Datos para facturación">
				<div className="grid gap-6 px-5 py-5 lg:grid-cols-3">
					<dl className="flex flex-col gap-2">
						<h3 className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
							Del contratante
						</h3>
						<Dato label="Razón social">{empresa.razonSocial}</Dato>
						<Dato label="Dirección legal">{empresa.direccion}</Dato>
						<Dato label="RUC">{empresa.ruc}</Dato>
						<Dato label="Teléfono">{empresa.telefono}</Dato>
					</dl>
					<dl className="flex flex-col gap-2">
						<h3 className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
							Del proveedor
						</h3>
						<Dato label="Razón social">{proveedor?.razonSocial ?? ""}</Dato>
						<Dato label="Dirección legal">{proveedor?.direccion ?? ""}</Dato>
						<Dato label="RUC">{proveedor?.ruc ?? ""}</Dato>
						<Dato label="Teléfono">{proveedor?.representanteTelefono ?? ""}</Dato>
					</dl>
					<dl className="flex flex-col gap-2">
						<h3 className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
							Del contrato
						</h3>
						<Dato label="Proyecto">{contrato.proyecto}</Dato>
						<Dato label="Ubicación">{contrato.ubicacion}</Dato>
						<Dato label="Documento">{contrato.documentoContractual}</Dato>
						<Dato label="Vigencia">
							{formatearFechaNumerica(contrato.fechaInicio)} al{" "}
							{formatearFechaNumerica(contrato.fechaFin)}
						</Dato>
						<Dato label="Moneda">{contrato.moneda}</Dato>
					</dl>
				</div>
			</Tarjeta>

			<ConfirmDialog
				open={emitiendo}
				onOpenChange={setEmitiendo}
				tono="primario"
				title={`¿Emitir la valorización de ${formatearPeriodo(valorizacion.periodo)}?`}
				description={`Se le asignará el siguiente número del año y quedará cerrada: ya no podrás cambiar las horas. Total de la factura: ${formatearMoneda(calculo.actual.total, moneda)}.`}
				confirmLabel="Emitir"
				onConfirm={() => {
					void (async () => {
						try {
							await Promise.all([horasGuardado.vaciar(), cabeceraGuardado.vaciar()]);
							const emitida = await valorizacionService.emitir(valorizacion.id, usuario);
							toast.success(`Valorización ${emitida.numero ?? ""} emitida.`);
						} catch {
							toast.error("No se pudo emitir. Revisa las horas e inténtalo de nuevo.");
						}
					})();
				}}
			>
				{excedidos.length > 0 && (
					<p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
						Atención:{" "}
						{excedidos.length === 1
							? "un equipo supera"
							: `${excedidos.length} equipos superan`}{" "}
						las horas contratadas.
					</p>
				)}
			</ConfirmDialog>
			{puedeAnular && (
				<AnularDialog
					open={anulando}
					onOpenChange={setAnulando}
					numero={valorizacion.numero ?? ""}
					onAnular={async (motivo) => {
						try {
							await valorizacionService.anular(valorizacion.id, motivo, usuario, user.rol);
							toast.success(`Valorización ${valorizacion.numero ?? ""} anulada.`);
							setAnulando(false);
						} catch {
							toast.error("No se pudo anular. Inténtalo de nuevo.");
						}
					}}
				/>
			)}
			<ConfirmDialog
				open={descartando}
				onOpenChange={setDescartando}
				title="¿Descartar este borrador?"
				description="Se quitará de la lista de valorizaciones. El contrato y sus datos no cambian."
				confirmLabel="Descartar"
				onConfirm={() => {
					void valorizacionService.eliminarBorrador(valorizacion.id, usuario).then(() => {
						toast.success("Borrador descartado.");
						void navigate("/valorizaciones");
					});
				}}
			/>
		</div>
	);
}

export function ValorizacionPage() {
	const { id = "" } = useParams();
	const planilla = useLiveQuery(
		async () => (await valorizacionService.obtenerPlanilla(id)) ?? null,
		[id],
	);

	if (planilla === undefined) {
		return <Skeleton aria-label="Cargando" className="h-96 w-full rounded-xl" />;
	}
	if (planilla === null) {
		return (
			<EmptyState
				icon={ClipboardList}
				title="Valorización no encontrada"
				description="Puede que se haya descartado."
			>
				<Link
					to="/valorizaciones"
					className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}
				>
					Ver valorizaciones
				</Link>
			</EmptyState>
		);
	}

	// Se vuelve a montar al cambiar de valorización para empezar con sus horas guardadas.
	return <Editor key={planilla.valorizacion.id} planilla={planilla} />;
}
