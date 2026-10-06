import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/useSession";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { FormSeccion } from "@/shared/components/FormSeccion";
import { RadioOptions } from "@/shared/components/RadioOptions";
import { SelectField } from "@/shared/components/SelectField";

import { terceroService } from "../application/terceroService.instance";
import {
	BANCOS,
	ESTADOS_CIVILES,
	ESTADOS_TERCERO,
	ETIQUETA_ESTADO,
	ETIQUETA_ESTADO_CIVIL,
	RucDuplicadoError,
	type Tercero,
	type TerceroDatos,
	type TerceroDatosInput,
	TerceroDatosSchema,
} from "../domain/tercero";

const VACIO: TerceroDatosInput = {
	razonSocial: "",
	ruc: "",
	direccion: "",
	correo: "",
	estado: "ACTIVO",
	representanteNombre: "",
	representanteDni: "",
	representanteTelefono: "",
	representanteDireccion: "",
	representanteEstadoCivil: "",
	banco: "",
	numeroCuenta: "",
	cci: "",
};

function aFormulario(tercero?: Tercero): TerceroDatosInput {
	if (!tercero) {
		return VACIO;
	}
	const {
		id: _id,
		codigo: _c,
		createdAt: _ca,
		updatedAt: _u,
		updatedBy: _b,
		deletedAt: _d,
		version: _v,
		...datos
	} = tercero;

	return datos;
}

const OPCIONES_ESTADO = ESTADOS_TERCERO.map((estado) => ({
	value: estado,
	label: ETIQUETA_ESTADO[estado],
}));
const OPCIONES_ESTADO_CIVIL = ESTADOS_CIVILES.map((estado) => ({
	value: estado,
	label: ETIQUETA_ESTADO_CIVIL[estado],
}));
const OPCIONES_BANCO = BANCOS.map((banco) => ({ value: banco, label: banco }));

function useTerceroFormulario({ tercero, onDone }: { tercero?: Tercero; onDone: () => void }) {
	const { user } = useSession();
	const {
		register,
		control,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<TerceroDatosInput, unknown, TerceroDatos>({
		resolver: zodResolver(TerceroDatosSchema),
		defaultValues: aFormulario(tercero),
	});

	const guardar = async (datos: TerceroDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (tercero) {
				await terceroService.actualizar(tercero.id, datos, usuario);
				toast.success("Cambios guardados.");
			} else {
				const creado = await terceroService.crear(datos, usuario);
				toast.success(`Cliente ${creado.codigo} registrado.`);
			}
			onDone();
		} catch (error) {
			if (error instanceof RucDuplicadoError) {
				setError("ruc", { message: `Este RUC ya está registrado como ${error.codigoExistente}.` });

				return;
			}
			toast.error("No se pudo guardar. Inténtalo de nuevo.");
		}
	};

	return {
		onSubmit: (event: React.FormEvent<HTMLFormElement>) => void handleSubmit(guardar)(event),
		isSubmitting,
		campos: (
			<div className="flex flex-col">
				<FormSeccion titulo="Datos de la empresa">
					<FormField label="Razón social" required error={errors.razonSocial?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("razonSocial")}
								placeholder="Ingresar razón social"
								className="uppercase placeholder:normal-case"
							/>
						)}
					</FormField>
					<Controller
						control={control}
						name="estado"
						render={({ field }) => (
							<RadioOptions
								label="Estado"
								name="estado"
								value={field.value}
								onChange={field.onChange}
								options={OPCIONES_ESTADO}
							/>
						)}
					/>
					<FormField label="RUC" required error={errors.ruc?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("ruc")}
								inputMode="numeric"
								maxLength={11}
								placeholder="Ingresar RUC"
								className="tabular-nums"
							/>
						)}
					</FormField>
					<FormField label="Correo" required error={errors.correo?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("correo")}
								type="email"
								inputMode="email"
								placeholder="Ingresar correo de la empresa"
							/>
						)}
					</FormField>
					<FormField
						label="Dirección"
						required
						error={errors.direccion?.message}
						className="sm:col-span-2"
					>
						{(campo) => (
							<Input
								{...campo}
								{...register("direccion")}
								placeholder="Ingresar dirección"
								className="uppercase placeholder:normal-case"
							/>
						)}
					</FormField>
				</FormSeccion>

				<FormSeccion titulo="Representante">
					<FormField
						label="Nombre completo"
						required
						error={errors.representanteNombre?.message}
						className="sm:col-span-2"
					>
						{(campo) => (
							<Input
								{...campo}
								{...register("representanteNombre")}
								placeholder="Ingresar nombre completo"
								className="uppercase placeholder:normal-case"
							/>
						)}
					</FormField>
					<FormField label="DNI" required error={errors.representanteDni?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("representanteDni")}
								inputMode="numeric"
								maxLength={8}
								placeholder="Ingresar DNI"
								className="tabular-nums"
							/>
						)}
					</FormField>
					<FormField label="Teléfono" required error={errors.representanteTelefono?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("representanteTelefono")}
								inputMode="tel"
								placeholder="Ingresar teléfono"
							/>
						)}
					</FormField>
					<FormField label="Estado civil" error={errors.representanteEstadoCivil?.message}>
						{(campo) => (
							<Controller
								control={control}
								name="representanteEstadoCivil"
								render={({ field }) => (
									<SelectField
										{...campo}
										value={field.value}
										onChange={field.onChange}
										options={OPCIONES_ESTADO_CIVIL}
										placeholder="Seleccionar estado civil"
									/>
								)}
							/>
						)}
					</FormField>
					<FormField label="Dirección" error={errors.representanteDireccion?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("representanteDireccion")}
								placeholder="Ingresar dirección"
							/>
						)}
					</FormField>
				</FormSeccion>

				<FormSeccion titulo="Datos bancarios">
					<FormField label="Banco" error={errors.banco?.message}>
						{(campo) => (
							<Controller
								control={control}
								name="banco"
								render={({ field }) => (
									<SelectField
										{...campo}
										value={field.value}
										onChange={field.onChange}
										options={OPCIONES_BANCO}
										placeholder="Seleccionar banco"
									/>
								)}
							/>
						)}
					</FormField>
					<FormField label="N.° de cuenta" error={errors.numeroCuenta?.message}>
						{(campo) => (
							<Input
								{...campo}
								{...register("numeroCuenta")}
								inputMode="numeric"
								placeholder="Ingresar n.° de cuenta"
							/>
						)}
					</FormField>
					<FormField label="CCI" error={errors.cci?.message} className="sm:col-span-2">
						{(campo) => (
							<Input
								{...campo}
								{...register("cci")}
								inputMode="numeric"
								maxLength={20}
								placeholder="Ingresar CCI de 20 dígitos"
							/>
						)}
					</FormField>
				</FormSeccion>
			</div>
		),
	};
}

function ContenidoFormulario({
	tercero,
	onDone,
	onOpenChange,
	open,
}: {
	tercero?: Tercero;
	onDone: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const { onSubmit, isSubmitting, campos } = useTerceroFormulario({ tercero, onDone });

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={tercero ? `Editar cliente ${tercero.codigo}` : "Nuevo cliente"}
			description="Datos de la empresa, del representante y bancarios."
			onSubmit={onSubmit}
			isSubmitting={isSubmitting}
			size="lg"
		>
			{campos}
		</FormDialog>
	);
}

export function TerceroFormDialog({
	open,
	onOpenChange,
	tercero,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tercero?: Tercero;
}) {
	// Se vuelve a montar al abrir para empezar con los datos del registro elegido.
	return open ? (
		<ContenidoFormulario
			key={tercero?.id ?? "nuevo"}
			open={open}
			onOpenChange={onOpenChange}
			tercero={tercero}
			onDone={() => onOpenChange(false)}
		/>
	) : null;
}
