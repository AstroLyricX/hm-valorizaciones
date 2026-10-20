import { Ban } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";

import {
	AnulacionSchema,
	DESCRIPCION_MOTIVO_ANULACION,
	ETIQUETA_MOTIVO_ANULACION,
	type MotivoAnulacion,
	MOTIVOS_ANULACION,
	textoAnulacion,
} from "../domain/valorizacion";

// Pide el motivo antes de anular: uno de la lista u "Otro", que se escribe.
// La valorización anulada conserva su número.
export function AnularDialog({
	open,
	onOpenChange,
	numero,
	onAnular,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	numero: string;
	onAnular: (motivo: string) => Promise<void>;
}) {
	const [motivo, setMotivo] = useState<MotivoAnulacion | "">("");
	const [detalle, setDetalle] = useState("");
	const [errores, setErrores] = useState<{ motivo?: string; detalle?: string }>({});
	const [anulando, setAnulando] = useState(false);
	const otro = motivo === "OTRO";

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={`Anular valorización ${numero}`}
			description="La valorización anulada conserva su número y deja de sumar horas."
			icon={Ban}
			submitLabel="Anular"
			isSubmitting={anulando}
			onSubmit={(event) => {
				event.preventDefault();
				const resultado = AnulacionSchema.safeParse({ motivo, detalle: otro ? detalle : "" });
				if (!resultado.success) {
					setErrores(
						Object.fromEntries(
							resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
						),
					);

					return;
				}
				setAnulando(true);
				void onAnular(textoAnulacion(resultado.data)).finally(() => setAnulando(false));
			}}
		>
			<div className="flex flex-col gap-4">
				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-[13px] font-medium text-navy-500">
						Motivo <span className="text-red-500">*</span>
					</legend>
					<div
						role="radiogroup"
						aria-label="Motivo"
						aria-invalid={errores.motivo !== undefined}
						className="grid gap-2 sm:grid-cols-2"
					>
						{MOTIVOS_ANULACION.map((opcion) => {
							const elegido = motivo === opcion;

							return (
								<label
									key={opcion}
									className={cn(
										"flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
										elegido
											? "border-brand-500 bg-brand-50/60"
											: "border-navy-100 hover:border-navy-200 hover:bg-navy-50/60",
									)}
								>
									<input
										type="radio"
										name="motivo-anulacion"
										value={opcion}
										checked={elegido}
										onChange={() => {
											setMotivo(opcion);
											setErrores({});
										}}
										className="peer sr-only"
									/>
									<span
										aria-hidden="true"
										className={cn(
											"mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
											elegido ? "border-brand-600" : "border-navy-200 bg-navy-50",
										)}
									>
										{elegido && <span className="size-2 rounded-full bg-brand-600" />}
									</span>
									<span className="flex flex-col">
										<span className="text-sm font-medium text-navy-900">
											{ETIQUETA_MOTIVO_ANULACION[opcion]}
										</span>
										<span className="text-xs text-muted-foreground">
											{DESCRIPCION_MOTIVO_ANULACION[opcion]}
										</span>
									</span>
								</label>
							);
						})}
					</div>
					{errores.motivo && <span className="text-xs text-destructive">{errores.motivo}</span>}
				</fieldset>
				{otro && (
					<FormField label="Describe el motivo" required error={errores.detalle}>
						{(campo) => (
							<Textarea
								{...campo}
								value={detalle}
								onChange={(event) => {
									setDetalle(event.target.value);
									setErrores({});
								}}
								placeholder="Por ejemplo: el cliente pidió reemitir con otra razón social"
								maxLength={250}
								rows={3}
							/>
						)}
					</FormField>
				)}
			</div>
		</FormDialog>
	);
}
