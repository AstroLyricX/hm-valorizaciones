import { useLiveQuery } from "dexie-react-hooks";
import {
	CloudUpload,
	Download,
	Eye,
	File as IconoArchivo,
	FileImage,
	FileSpreadsheet,
	FileText,
	LoaderCircle,
	type LucideIcon,
	Paperclip,
	Trash2,
	Upload,
} from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { db } from "@/data/db";
import { useSession } from "@/features/auth/useSession";
import { useSincronizacion } from "@/features/sincronizacion/SyncContext";
import { formatearFechaCorta } from "@/lib/fechas";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

import { ArchivoNoValidoError, puedeQuitar } from "../application/DocumentoService";
import { documentoService } from "../application/documentoService.instance";
import {
	ACEPTA,
	type Documento,
	type EntidadDocumento,
	formatearTamano,
	type FormatoDocumento,
	formatoDocumento,
	MAX_DOCUMENTOS,
	MAX_MB,
} from "../domain/documento";

const ICONO: Record<FormatoDocumento, { icono: LucideIcon; tono: string }> = {
	PDF: { icono: FileText, tono: "bg-red-50 text-red-600" },
	Imagen: { icono: FileImage, tono: "bg-sky-50 text-sky-600" },
	Word: { icono: IconoArchivo, tono: "bg-blue-50 text-blue-700" },
	Excel: { icono: FileSpreadsheet, tono: "bg-emerald-50 text-emerald-700" },
};

// PDF e imágenes se abren en el navegador; Word y Excel se descargan.
function seVe(documento: Documento): boolean {
	const formato = formatoDocumento(documento.tipo);

	return formato === "PDF" || formato === "Imagen";
}

function guardarComo(archivo: Blob, nombre: string): void {
	const url = URL.createObjectURL(archivo);
	const enlace = document.createElement("a");
	enlace.href = url;
	enlace.download = nombre;
	enlace.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Documentos adjuntos de un equipo, contrato o valorización: casi siempre PDF.
// Se guardan en el dispositivo al instante y la sincronización los sube a SharePoint.
export function DocumentosAdjuntos({
	entidad,
	registroId,
	descripcion,
	className,
}: {
	entidad: EntidadDocumento;
	registroId: string;
	// Qué conviene adjuntar aquí, por ejemplo "Contrato firmado, órdenes de servicio…".
	descripcion: string;
	className?: string;
}) {
	const { user } = useSession();
	const { descargarArchivo } = useSincronizacion();
	const entrada = useRef<HTMLInputElement>(null);
	const [subiendo, setSubiendo] = useState(false);
	const [arrastrando, setArrastrando] = useState(false);
	const [abriendo, setAbriendo] = useState<string | null>(null);
	const [quitando, setQuitando] = useState<Documento | null>(null);
	const documentos = useLiveQuery(
		async () => documentoService.listar(entidad, registroId),
		[entidad, registroId],
	);
	const porSubir = new Set(
		useLiveQuery(
			async () =>
				(await db.archivosDocumento.where("pendiente").equals(1).primaryKeys()).map(String),
			[],
		) ?? [],
	);
	const usuario = user?.email ?? "";
	const lleno = (documentos?.length ?? 0) >= MAX_DOCUMENTOS;

	const subir = async (archivos: readonly File[]) => {
		if (archivos.length === 0) {
			return;
		}
		setSubiendo(true);
		let subidos = 0;
		for (const archivo of archivos) {
			try {
				// eslint-disable-next-line no-await-in-loop -- en orden, para respetar el tope de documentos.
				await documentoService.subir(entidad, registroId, archivo, usuario);
				subidos++;
			} catch (error) {
				toast.error(
					error instanceof ArchivoNoValidoError
						? error.message
						: `No se pudo guardar «${archivo.name}». Inténtalo de nuevo.`,
				);
			}
		}
		setSubiendo(false);
		if (subidos > 0) {
			toast.success(subidos === 1 ? "Documento agregado." : `${subidos} documentos agregados.`);
		}
	};

	const abrir = async (documento: Documento, descargar: boolean) => {
		// La pestaña se abre antes de esperar el archivo: si no, el navegador la bloquea.
		const ventana = descargar ? null : window.open("", "_blank");
		setAbriendo(documento.id);
		try {
			const archivo = await documentoService.archivo(documento, descargarArchivo);
			if (ventana) {
				ventana.location.href = URL.createObjectURL(archivo);
			} else {
				guardarComo(archivo, documento.nombre);
			}
		} catch (error) {
			ventana?.close();
			toast.error(
				error instanceof Error && error.name === "ArchivoNoDisponibleError"
					? error.message
					: "No se pudo abrir el documento. Inténtalo de nuevo.",
			);
		} finally {
			setAbriendo(null);
		}
	};

	const soltar = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setArrastrando(false);
		void subir([...event.dataTransfer.files]);
	};

	return (
		<section
			aria-labelledby={`documentos-${registroId}`}
			onDragOver={(event) => {
				event.preventDefault();
				setArrastrando(true);
			}}
			onDragLeave={() => setArrastrando(false)}
			onDrop={soltar}
			className={cn(
				"overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] transition-colors dark:bg-card",
				arrastrando && "border-brand-500 bg-brand-50/40",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-3 border-b border-navy-100 px-5 py-3 md:px-6">
				<h2
					id={`documentos-${registroId}`}
					className="flex items-center gap-2 text-sm font-semibold text-navy-900"
				>
					Documentos
					{documentos && documentos.length > 0 && (
						<span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-600 tabular-nums">
							{documentos.length}
						</span>
					)}
				</h2>
				<Button
					variant="outline"
					className="h-9 px-3.5"
					disabled={subiendo || lleno}
					title={lleno ? `Máximo ${MAX_DOCUMENTOS} documentos` : undefined}
					onClick={() => entrada.current?.click()}
				>
					{subiendo ? <LoaderCircle className="animate-spin" /> : <Upload />}
					Subir documento
				</Button>
				<input
					ref={entrada}
					type="file"
					accept={ACEPTA}
					multiple
					hidden
					aria-label="Elegir documentos"
					onChange={(event) => {
						const archivos = [...(event.target.files ?? [])];
						event.target.value = "";
						void subir(archivos);
					}}
				/>
			</div>

			{documentos === undefined ? null : documentos.length === 0 ? (
				<button
					type="button"
					onClick={() => entrada.current?.click()}
					className="m-4 flex w-[calc(100%-2rem)] flex-col items-center gap-1.5 rounded-lg border border-dashed border-navy-200 px-4 py-6 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/40 md:mx-6 md:w-[calc(100%-3rem)]"
				>
					<Paperclip className="size-5 text-navy-400" aria-hidden="true" />
					<span className="text-sm font-medium text-navy-800">{descripcion}</span>
					<span className="text-xs text-muted-foreground">
						Arrastra los archivos aquí o toca para elegirlos. PDF, imágenes, Word o Excel, hasta{" "}
						{MAX_MB} MB cada uno.
					</span>
				</button>
			) : (
				<ul className="divide-y divide-navy-100">
					{documentos.map((documento) => {
						const formato = formatoDocumento(documento.tipo);
						const { icono: Icono, tono } = ICONO[formato];
						const cargando = abriendo === documento.id;

						return (
							<li key={documento.id} className="flex items-center gap-3 px-5 py-3 md:px-6">
								<span
									className={cn(
										"flex size-9 shrink-0 items-center justify-center rounded-lg",
										tono,
									)}
								>
									<Icono className="size-4.5" aria-hidden="true" />
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<button
										type="button"
										onClick={() => void abrir(documento, !seVe(documento))}
										className="truncate text-left text-sm font-medium text-navy-900 hover:text-brand-700 hover:underline"
										title={documento.nombre}
									>
										{documento.nombre}
									</button>
									<span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
										<span>
											{formato} · {formatearTamano(documento.tamano)} ·{" "}
											{formatearFechaCorta(documento.createdAt)} · {documento.subidoPor}
										</span>
										{porSubir.has(documento.id) && (
											<span className="inline-flex items-center gap-1 font-medium text-brand-700">
												<CloudUpload className="size-3.5" aria-hidden="true" />
												Por subir
											</span>
										)}
									</span>
								</span>
								<span className="flex shrink-0 items-center gap-1">
									{cargando ? (
										<LoaderCircle
											className="size-4 animate-spin text-brand-600"
											aria-label="Abriendo"
										/>
									) : (
										<>
											{seVe(documento) && (
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={`Ver ${documento.nombre}`}
													title="Ver"
													onClick={() => void abrir(documento, false)}
												>
													<Eye />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Descargar ${documento.nombre}`}
												title="Descargar"
												onClick={() => void abrir(documento, true)}
											>
												<Download />
											</Button>
										</>
									)}
									{puedeQuitar(documento, usuario, user?.rol) && (
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Quitar ${documento.nombre}`}
											title="Quitar"
											className="text-navy-400 hover:text-red-600"
											onClick={() => setQuitando(documento)}
										>
											<Trash2 />
										</Button>
									)}
								</span>
							</li>
						);
					})}
				</ul>
			)}

			<ConfirmDialog
				open={quitando !== null}
				onOpenChange={(abierto) => {
					if (!abierto) {
						setQuitando(null);
					}
				}}
				title="¿Quitar el documento?"
				description={`«${quitando?.nombre ?? ""}» dejará de verse aquí. La copia en SharePoint se conserva.`}
				confirmLabel="Quitar"
				onConfirm={() => {
					const documento = quitando;
					setQuitando(null);
					if (documento) {
						void documentoService
							.quitar(documento.id, usuario, user?.rol)
							.then(() => toast.success("Documento quitado."))
							.catch(() => toast.error("No se pudo quitar el documento."));
					}
				}}
			/>
		</section>
	);
}
