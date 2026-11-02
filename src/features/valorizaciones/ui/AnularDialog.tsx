import { Ban } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { OpcionesMotivo } from "@/shared/components/OpcionesMotivo";

import {
	AnulacionSchema,
	DESCRIPCION_MOTIVO_ANULACION,
	ETIQUETA_MOTIVO_ANULACION,
	type MotivoAnulacion,
	MOTIVOS_ANULACION,
	textoAnulacion,
} from "../domain/valorizacion";

const OPCIONES = MOTIVOS_ANULACION.map((motivo) => ({
	value: motivo,
	label: ETIQUETA_MOTIVO_ANULACION[motivo],
	descripcion: DESCRIPCION_MOTIVO_ANULACION[motivo],
}));

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
			description="Deja de sumar horas. Su corrección se emite con el mismo número."
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
				<OpcionesMotivo
					name="motivo-anulacion"
					value={motivo}
					onChange={(opcion) => {
						setMotivo(opcion);
						setErrores({});
					}}
					opciones={OPCIONES}
					error={errores.motivo}
				/>
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
