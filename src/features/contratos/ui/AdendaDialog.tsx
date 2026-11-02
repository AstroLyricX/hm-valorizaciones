import { FilePlus2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/useSession";
import { DateField } from "@/shared/components/DateField";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { OpcionesMotivo } from "@/shared/components/OpcionesMotivo";

import { FechaAdendaNoValidaError } from "../application/ContratoService";
import { contratoService } from "../application/contratoService.instance";
import {
	AdendaDatosSchema,
	DESCRIPCION_MOTIVO_ADENDA,
	ETIQUETA_MOTIVO_ADENDA,
	type MotivoAdenda,
	MOTIVOS_ADENDA,
} from "../domain/adenda";
import { type Contrato, hoyIso } from "../domain/contrato";

const OPCIONES = MOTIVOS_ADENDA.map((motivo) => ({
	value: motivo,
	label: ETIQUETA_MOTIVO_ADENDA[motivo],
	descripcion: DESCRIPCION_MOTIVO_ADENDA[motivo],
}));

type Errores = Partial<Record<"fecha" | "motivo" | "detalle", string>>;

// Registra una adenda del contrato: fecha y motivo (uno de la lista u "Otro", que se escribe).
export function AdendaDialog({
	open,
	onOpenChange,
	contrato,
	numero,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contrato: Contrato;
	// Número que recibirá la adenda.
	numero: number;
}) {
	const { user } = useSession();
	const [fecha, setFecha] = useState(hoyIso());
	const [motivo, setMotivo] = useState<MotivoAdenda | "">("");
	const [detalle, setDetalle] = useState("");
	const [errores, setErrores] = useState<Errores>({});
	const [guardando, setGuardando] = useState(false);
	const otro = motivo === "OTRO";

	const cambiarAbierto = (abierto: boolean) => {
		if (abierto) {
			setFecha(hoyIso());
			setMotivo("");
			setDetalle("");
			setErrores({});
		}
		onOpenChange(abierto);
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={cambiarAbierto}
			title={`Agregar adenda N.° ${numero}`}
			description={`Registra la modificación del contrato ${contrato.codigo}.`}
			icon={FilePlus2}
			submitLabel="Agregar adenda"
			isSubmitting={guardando}
			onSubmit={(event) => {
				event.preventDefault();
				const resultado = AdendaDatosSchema.safeParse({
					fecha,
					motivo,
					detalle: otro ? detalle : "",
				});
				if (!resultado.success) {
					setErrores(
						Object.fromEntries(
							resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
						),
					);

					return;
				}
				setGuardando(true);
				void (async () => {
					try {
						const adenda = await contratoService.agregarAdenda(
							contrato.id,
							resultado.data,
							user?.email ?? "",
						);
						toast.success(`Adenda N.° ${adenda.numero} agregada.`);
						onOpenChange(false);
					} catch (error) {
						if (error instanceof FechaAdendaNoValidaError) {
							setErrores({ fecha: "No puede ser anterior al inicio del contrato." });
						} else {
							toast.error("No se pudo agregar la adenda. Inténtalo de nuevo.");
						}
					} finally {
						setGuardando(false);
					}
				})();
			}}
		>
			<div className="flex flex-col gap-4">
				<FormField label="Fecha de la adenda" required error={errores.fecha}>
					{(campo) => (
						<DateField
							{...campo}
							value={fecha}
							onChange={(valor) => {
								setFecha(valor);
								setErrores({});
							}}
						/>
					)}
				</FormField>
				<OpcionesMotivo
					name="motivo-adenda"
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
								placeholder="Por ejemplo: cambio de ubicación de la obra"
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
