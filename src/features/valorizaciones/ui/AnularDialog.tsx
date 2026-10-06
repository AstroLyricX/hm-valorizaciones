import { Ban } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";

import { MotivoAnulacionSchema } from "../domain/valorizacion";

// Pide el motivo antes de anular. La valorización anulada conserva su número.
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
	const [motivo, setMotivo] = useState("");
	const [error, setError] = useState<string>();
	const [anulando, setAnulando] = useState(false);

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
				const resultado = MotivoAnulacionSchema.safeParse(motivo);
				if (!resultado.success) {
					setError(resultado.error.issues[0]?.message);

					return;
				}
				setAnulando(true);
				void onAnular(resultado.data).finally(() => setAnulando(false));
			}}
		>
			<div className="flex flex-col gap-4">
				<p className="text-sm text-navy-600">
					La valorización quedará anulada: sus horas dejan de contar como anteriores y su número no
					se vuelve a usar.
				</p>
				<FormField label="Motivo" required error={error}>
					{(campo) => (
						<Textarea
							{...campo}
							value={motivo}
							onChange={(event) => {
								setMotivo(event.target.value);
								setError(undefined);
							}}
							placeholder="Ingresar motivo, por ejemplo horas mal cargadas"
							rows={3}
						/>
					)}
				</FormField>
			</div>
		</FormDialog>
	);
}
