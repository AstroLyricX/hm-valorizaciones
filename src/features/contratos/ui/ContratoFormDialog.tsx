import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/useSession";
import type { Tercero } from "@/features/clientes/domain/tercero";
import type { Equipo } from "@/features/equipos/domain/equipo";
import { DateField } from "@/shared/components/DateField";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { FormSeccion } from "@/shared/components/FormSeccion";
import { SelectField } from "@/shared/components/SelectField";

import { ClienteNoValidoError, type ContratoDetalle } from "../application/ContratoService";
import { contratoService } from "../application/contratoService.instance";
import { CONTRAPARTE, type TipoContrato, TIPOS_CONTRATO } from "../domain/contrato";
import {
	aFormulario,
	type ContratoDatos,
	type ContratoFormInput,
	ContratoFormSchema,
	FORMULARIO_VACIO,
} from "./contratoForm";
import { EquiposEditor } from "./EquiposEditor";

const mayus = "uppercase placeholder:normal-case";

const OPCIONES_TIPO = TIPOS_CONTRATO.map((tipo) => ({
	value: tipo,
	label:
		tipo === "EMITIDO"
			? "Emitido: H&M alquila a un cliente"
			: "Recibido: un proveedor alquila a H&M",
}));

function Formulario({
	detalle,
	terceros,
	equipos,
	open,
	onOpenChange,
}: {
	detalle?: ContratoDetalle;
	// Clientes y proveedores activos (más la contraparte del contrato que se edita).
	terceros: readonly Tercero[];
	equipos: readonly Equipo[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { user } = useSession();
	const navigate = useNavigate();
	const {
		register,
		handleSubmit,
		control,
		setError,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<ContratoFormInput, unknown, ContratoDatos>({
		resolver: zodResolver(ContratoFormSchema),
		defaultValues: detalle ? aFormulario(detalle.contrato, detalle.equipos) : FORMULARIO_VACIO,
	});
	const tipo: TipoContrato =
		useWatch({ control, name: "tipo" }) === "RECIBIDO" ? "RECIBIDO" : "EMITIDO";
	const terceroId = useWatch({ control, name: "terceroId" });
	const contraparte = CONTRAPARTE[tipo];
	const opcionesContraparte = terceros
		.filter((tercero) => tercero.tipo === contraparte.tipo)
		.map((tercero) => ({ value: tercero.id, label: tercero.razonSocial }));
	// En un contrato recibido, el proveedor alquila sus propios equipos.
	const equiposDisponibles =
		tipo === "RECIBIDO" ? equipos.filter((equipo) => equipo.duenoId === terceroId) : equipos;

	const guardar = async (datos: ContratoDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (detalle) {
				await contratoService.actualizar(detalle.contrato.id, datos, usuario);
				toast.success("Cambios guardados.");
				onOpenChange(false);
			} else {
				const { contrato } = await contratoService.crear(datos, usuario);
				toast.success(`Contrato ${contrato.codigo} registrado.`);
				onOpenChange(false);
				await navigate(`/contratos/${contrato.id}`);
			}
		} catch (error) {
			if (error instanceof ClienteNoValidoError) {
				setError("terceroId", {
					message: `El ${contraparte.nombre} seleccionado está inactivo. Selecciona otro.`,
				});

				return;
			}
			toast.error("No se pudo guardar el contrato. Inténtalo de nuevo.");
		}
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={detalle ? `Editar contrato ${detalle.contrato.codigo}` : "Nuevo contrato"}
			description="Datos del contrato y equipos con sus horas mínimas y costo por hora."
			onSubmit={(event) => void handleSubmit(guardar)(event)}
			isSubmitting={isSubmitting}
			size="xl"
		>
			<FormSeccion>
				<FormField
					label="Tipo de contrato"
					required
					error={errors.tipo?.message}
					hint={
						tipo === "EMITIDO"
							? "H&M emite las valorizaciones y cobra."
							: "H&M recibe las valorizaciones del proveedor y paga."
					}
				>
					{(campo) => (
						<Controller
							control={control}
							name="tipo"
							render={({ field }) => (
								<SelectField
									{...campo}
									value={field.value}
									onChange={(valor) => {
										field.onChange(valor);
										// Cambia la lista de contrapartes: se vuelve a elegir.
										setValue("terceroId", "");
									}}
									options={OPCIONES_TIPO}
								/>
							)}
						/>
					)}
				</FormField>
				<FormField label={contraparte.titulo} required error={errors.terceroId?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="terceroId"
							render={({ field }) => (
								<SelectField
									{...campo}
									value={field.value}
									onChange={field.onChange}
									options={opcionesContraparte}
									placeholder={`Seleccionar ${contraparte.nombre}`}
								/>
							)}
						/>
					)}
				</FormField>
				<FormField label="N.° de documento" error={errors.documentoContractual?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("documentoContractual")}
							placeholder="Ingresar n.° de orden o contrato"
						/>
					)}
				</FormField>
				<FormField label="Proyecto" required error={errors.proyecto?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("proyecto")}
							placeholder="Ingresar proyecto"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Ubicación" required error={errors.ubicacion?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("ubicacion")}
							placeholder="Ingresar ubicación"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Fecha de inicio" required error={errors.fechaInicio?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="fechaInicio"
							render={({ field }) => (
								<DateField {...campo} value={field.value} onChange={field.onChange} />
							)}
						/>
					)}
				</FormField>
				<FormField label="Fecha de fin" required error={errors.fechaFin?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="fechaFin"
							render={({ field }) => (
								<DateField {...campo} value={field.value} onChange={field.onChange} />
							)}
						/>
					)}
				</FormField>
				<FormField label="Fondo de garantía (%)" error={errors.fondoGarantiaPct?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("fondoGarantiaPct")}
							inputMode="decimal"
							placeholder="Ingresar porcentaje"
							className="tabular-nums"
						/>
					)}
				</FormField>
				<FormField label="Observaciones" error={errors.observaciones?.message}>
					{(campo) => (
						<Textarea
							{...campo}
							{...register("observaciones")}
							rows={1}
							placeholder="Ingresar observaciones"
						/>
					)}
				</FormField>
			</FormSeccion>
			<EquiposEditor
				control={control}
				register={register}
				errors={errors}
				equipos={equiposDisponibles}
			/>
		</FormDialog>
	);
}

export function ContratoFormDialog({
	open,
	onOpenChange,
	detalle,
	terceros,
	equipos,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	detalle?: ContratoDetalle;
	terceros: readonly Tercero[];
	equipos: readonly Equipo[];
}) {
	return open ? (
		<Formulario
			key={detalle?.contrato.version ?? "nuevo"}
			open={open}
			onOpenChange={onOpenChange}
			detalle={detalle}
			terceros={terceros}
			equipos={equipos}
		/>
	) : null;
}
