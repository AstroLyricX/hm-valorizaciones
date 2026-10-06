import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/useSession";
import type { Tercero } from "@/features/clientes/domain/tercero";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { FormSeccion } from "@/shared/components/FormSeccion";
import { SelectField } from "@/shared/components/SelectField";

import { equipoService } from "../application/equipoService.instance";
import {
	ActivoFijoDuplicadoError,
	CATEGORIAS_EQUIPO,
	type Equipo,
	type EquipoDatos,
	type EquipoDatosInput,
	EquipoDatosSchema,
	ESTADOS_EQUIPO,
	ETIQUETA_CATEGORIA,
	ETIQUETA_ESTADO_EQUIPO,
	PlacaDuplicadaError,
} from "../domain/equipo";

const VACIO: EquipoDatosInput = {
	activoFijo: "",
	descripcion: "",
	fabricante: "",
	modelo: "",
	serieEquipo: "",
	marcaMotor: "",
	tipoMotor: "",
	serieMotor: "",
	placa: "",
	anio: "",
	categoria: "PESADO",
	estado: "P",
	duenoId: "",
	observaciones: "",
};

function aFormulario(equipo?: Equipo): EquipoDatosInput {
	if (!equipo) {
		return VACIO;
	}
	const {
		id: _id,
		createdAt: _c,
		updatedAt: _u,
		updatedBy: _b,
		deletedAt: _d,
		version: _v,
		...datos
	} = equipo;

	return datos;
}

const OPCIONES_CATEGORIA = CATEGORIAS_EQUIPO.map((categoria) => ({
	value: categoria,
	label: ETIQUETA_CATEGORIA[categoria],
}));
const OPCIONES_ESTADO = ESTADOS_EQUIPO.map((estado) => ({
	value: estado,
	label: `${estado} · ${ETIQUETA_ESTADO_EQUIPO[estado]}`,
}));
const mayus = "uppercase placeholder:normal-case";

function Formulario({
	equipo,
	duenos,
	open,
	onOpenChange,
}: {
	equipo?: Equipo;
	duenos: readonly Tercero[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { user } = useSession();
	const {
		register,
		control,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<EquipoDatosInput, unknown, EquipoDatos>({
		resolver: zodResolver(EquipoDatosSchema),
		defaultValues: aFormulario(equipo),
	});
	const opcionesDueno = duenos.map((dueno) => ({ value: dueno.id, label: dueno.razonSocial }));

	const guardar = async (datos: EquipoDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (equipo) {
				await equipoService.actualizar(equipo.id, datos, usuario);
				toast.success("Cambios guardados.");
			} else {
				const creado = await equipoService.crear(datos, usuario);
				toast.success(`Equipo ${creado.activoFijo} registrado.`);
			}
			onOpenChange(false);
		} catch (error) {
			if (error instanceof ActivoFijoDuplicadoError) {
				setError("activoFijo", { message: "Este activo fijo ya está registrado." });

				return;
			}
			if (error instanceof PlacaDuplicadaError) {
				setError("placa", {
					message: `Esta placa ya está registrada en ${error.activoFijoExistente}.`,
				});

				return;
			}
			toast.error("No se pudo guardar. Inténtalo de nuevo.");
		}
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={equipo ? `Editar equipo ${equipo.activoFijo}` : "Nuevo equipo"}
			description="Identificación, motor, dueño y estado del equipo."
			onSubmit={(event) => void handleSubmit(guardar)(event)}
			isSubmitting={isSubmitting}
			size="lg"
		>
			<FormSeccion titulo="Identificación">
				<FormField label="Activo fijo" required error={errors.activoFijo?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("activoFijo")}
							placeholder="Ingresar código de activo fijo"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Categoría" required error={errors.categoria?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="categoria"
							render={({ field }) => (
								<SelectField
									{...campo}
									value={field.value}
									onChange={field.onChange}
									options={OPCIONES_CATEGORIA}
									placeholder="Seleccionar categoría"
								/>
							)}
						/>
					)}
				</FormField>
				<FormField
					label="Descripción del equipo"
					required
					error={errors.descripcion?.message}
					className="sm:col-span-2"
				>
					{(campo) => (
						<Input
							{...campo}
							{...register("descripcion")}
							placeholder="Ingresar descripción, por ejemplo Excavadora"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Fabricante" required error={errors.fabricante?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("fabricante")}
							placeholder="Ingresar fabricante"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Modelo" required error={errors.modelo?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("modelo")}
							placeholder="Ingresar modelo"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Placa" required error={errors.placa?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("placa")}
							placeholder="Ingresar placa"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Año" required error={errors.anio?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("anio")}
							inputMode="numeric"
							maxLength={4}
							placeholder="Ingresar año"
							className="tabular-nums"
						/>
					)}
				</FormField>
				<FormField
					label="Serie del equipo"
					error={errors.serieEquipo?.message}
					className="sm:col-span-2"
				>
					{(campo) => (
						<Input
							{...campo}
							{...register("serieEquipo")}
							placeholder="Ingresar serie (algunos equipos livianos no tienen)"
							className={mayus}
						/>
					)}
				</FormField>
			</FormSeccion>

			<FormSeccion titulo="Motor">
				<FormField label="Marca del motor" required error={errors.marcaMotor?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("marcaMotor")}
							placeholder="Ingresar marca del motor"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField label="Tipo de motor" error={errors.tipoMotor?.message}>
					{(campo) => (
						<Input
							{...campo}
							{...register("tipoMotor")}
							placeholder="Ingresar tipo de motor"
							className={mayus}
						/>
					)}
				</FormField>
				<FormField
					label="Serie del motor"
					error={errors.serieMotor?.message}
					className="sm:col-span-2"
				>
					{(campo) => (
						<Input
							{...campo}
							{...register("serieMotor")}
							placeholder="Ingresar serie del motor"
							className={mayus}
						/>
					)}
				</FormField>
			</FormSeccion>

			<FormSeccion titulo="Dueño y estado">
				<FormField label="Dueño" required error={errors.duenoId?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="duenoId"
							render={({ field }) => (
								<SelectField
									{...campo}
									value={field.value}
									onChange={field.onChange}
									options={opcionesDueno}
									placeholder="Seleccionar dueño"
								/>
							)}
						/>
					)}
				</FormField>
				<FormField label="Estado" required error={errors.estado?.message}>
					{(campo) => (
						<Controller
							control={control}
							name="estado"
							render={({ field }) => (
								<SelectField
									{...campo}
									value={field.value}
									onChange={field.onChange}
									options={OPCIONES_ESTADO}
									placeholder="Seleccionar estado"
								/>
							)}
						/>
					)}
				</FormField>
				<FormField
					label="Observaciones"
					error={errors.observaciones?.message}
					className="sm:col-span-2"
				>
					{(campo) => (
						<Textarea
							{...campo}
							{...register("observaciones")}
							rows={2}
							placeholder="Ingresar observaciones"
						/>
					)}
				</FormField>
			</FormSeccion>
		</FormDialog>
	);
}

export function EquipoFormDialog({
	open,
	onOpenChange,
	equipo,
	duenos,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipo?: Equipo;
	duenos: readonly Tercero[];
}) {
	return open ? (
		<Formulario
			key={equipo?.id ?? "nuevo"}
			open={open}
			onOpenChange={onOpenChange}
			equipo={equipo}
			duenos={duenos}
		/>
	) : null;
}
