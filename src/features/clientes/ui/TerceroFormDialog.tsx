import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/useSession";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { FormSeccion } from "@/shared/components/FormSeccion";
import { RadioOptions } from "@/shared/components/RadioOptions";
import { SelectField } from "@/shared/components/SelectField";
import { rucValido } from "@/shared/domain/ruc";

import { rucService, servicioDe } from "../application/terceroService.instance";
import {
	BANCOS,
	ESTADOS_CIVILES,
	ESTADOS_TERCERO,
	ETIQUETA_ESTADO,
	ETIQUETA_ESTADO_CIVIL,
	PrefijoEquiposDuplicadoError,
	RucDuplicadoError,
	sugerirPrefijo,
	type Tercero,
	type TerceroDatos,
	type TerceroDatosInput,
	TerceroDatosSchema,
	type TipoTercero,
} from "../domain/tercero";
import { type EstadoConsulta, EstadoConsultaRuc } from "./EstadoConsultaRuc";

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
	prefijoEquipos: "",
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

const NOMBRE: Record<TipoTercero, { singular: string; titulo: string }> = {
	CLIENTE: { singular: "cliente", titulo: "Cliente" },
	PROVEEDOR: { singular: "proveedor", titulo: "Proveedor" },
};

function useTerceroFormulario({
	tipo,
	tercero,
	onDone,
}: {
	tipo: TipoTercero;
	tercero?: Tercero;
	onDone: () => void;
}) {
	const servicio = servicioDe(tipo);
	const { user } = useSession();
	const {
		register,
		control,
		handleSubmit,
		setError,
		setValue,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<TerceroDatosInput, unknown, TerceroDatos>({
		resolver: zodResolver(TerceroDatosSchema),
		defaultValues: aFormulario(tercero),
	});

	const [consulta, setConsulta] = useState<EstadoConsulta>({ tipo: "inicial" });
	const razonSocial = useWatch({ control, name: "razonSocial" });
	const prefijoEscrito = useWatch({ control, name: "prefijoEquipos" });
	// Lo que se usará si el campo queda vacío: el código actual o las iniciales de la razón social.
	const prefijoPorDefecto =
		(tercero?.prefijoEquipos ?? "") ||
		(razonSocial.trim().length >= 3 ? sugerirPrefijo(razonSocial) : "");
	const prefijoFinal = prefijoEscrito.trim().toUpperCase() || prefijoPorDefecto;

	// Completa la razón social y la dirección con los datos de SUNAT (siguen siendo editables).
	const consultarRuc = async (ruc: string) => {
		setConsulta({ tipo: "buscando" });
		const resultado = await rucService.consultar(ruc);
		setConsulta(resultado);
		if (resultado.tipo === "invalido") {
			setError("ruc", { message: "El RUC no es válido. Revisa los dígitos." });
		}
		if (resultado.tipo === "encontrado") {
			const opciones = { shouldValidate: true, shouldDirty: true };
			setValue("razonSocial", resultado.datos.razonSocial, opciones);
			if (resultado.datos.direccion) {
				setValue("direccion", resultado.datos.direccion, opciones);
			}
		}
	};

	const guardar = async (datos: TerceroDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (tercero) {
				await servicio.actualizar(tercero.id, datos, usuario);
				toast.success("Cambios guardados.");
			} else {
				const creado = await servicio.crear(datos, usuario);
				toast.success(`${NOMBRE[tipo].titulo} ${creado.codigo} registrado.`);
			}
			onDone();
		} catch (error) {
			if (error instanceof RucDuplicadoError) {
				setError("ruc", { message: `Este RUC ya está registrado como ${error.codigoExistente}.` });

				return;
			}
			if (error instanceof PrefijoEquiposDuplicadoError) {
				setError("prefijoEquipos", {
					message: `Este código ya lo usa ${error.codigoExistente}. Elige otro.`,
				});

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
							<div className="flex flex-col gap-1.5">
								<div className="flex gap-2">
									<Input
										{...campo}
										{...register("ruc", {
											// Al completar los 11 dígitos de un cliente nuevo se consulta solo.
											onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
												const ruc = event.target.value.trim();
												if (!tercero && rucService.disponible && rucValido(ruc)) {
													void consultarRuc(ruc);
												}
											},
										})}
										inputMode="numeric"
										maxLength={11}
										placeholder="Ingresar RUC"
										className="tabular-nums"
									/>
									{rucService.disponible && (
										<Button
											type="button"
											variant="outline"
											className="h-10 shrink-0 px-3"
											disabled={consulta.tipo === "buscando"}
											onClick={() => void consultarRuc(getValues("ruc"))}
										>
											<Search />
											<span className="max-sm:sr-only">Buscar en SUNAT</span>
										</Button>
									)}
								</div>
								<EstadoConsultaRuc estado={consulta} />
							</div>
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
					{tipo === "PROVEEDOR" && (
						<FormField
							label="Código de equipos"
							error={errors.prefijoEquipos?.message}
							hint={
								prefijoFinal
									? `Sus equipos serán ${prefijoFinal}001, ${prefijoFinal}002…`
									: "Vacío: se usan las iniciales de la razón social."
							}
						>
							{(campo) => (
								<Input
									{...campo}
									{...register("prefijoEquipos")}
									maxLength={4}
									placeholder={prefijoPorDefecto || "Ingresar código, por ejemplo HQA"}
									className="uppercase"
								/>
							)}
						</FormField>
					)}
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
	tipo,
	tercero,
	onDone,
	onOpenChange,
	open,
}: {
	tipo: TipoTercero;
	tercero?: Tercero;
	onDone: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const { onSubmit, isSubmitting, campos } = useTerceroFormulario({ tipo, tercero, onDone });
	const { singular } = NOMBRE[tipo];

	return (
		<FormDialog
			open={open}
			onOpenChange={onOpenChange}
			title={tercero ? `Editar ${singular} ${tercero.codigo}` : `Nuevo ${singular}`}
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
	tipo,
	open,
	onOpenChange,
	tercero,
}: {
	tipo: TipoTercero;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tercero?: Tercero;
}) {
	// Se vuelve a montar al abrir para empezar con los datos del registro elegido.
	return open ? (
		<ContenidoFormulario
			key={tercero?.id ?? "nuevo"}
			tipo={tipo}
			open={open}
			onOpenChange={onOpenChange}
			tercero={tercero}
			onDone={() => onOpenChange(false)}
		/>
	) : null;
}
