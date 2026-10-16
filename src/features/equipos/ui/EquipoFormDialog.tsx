import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/useSession";
import { sugerirPrefijo, type Tercero } from "@/features/clientes/domain/tercero";
import { FormDialog } from "@/shared/components/FormDialog";
import { FormField } from "@/shared/components/FormField";
import { FormSeccion } from "@/shared/components/FormSeccion";
import { SelectField } from "@/shared/components/SelectField";

import { equipoService } from "../application/equipoService.instance";
import { PREFIJO_PROPIO, siguienteActivoFijo } from "../domain/activoFijo";
import {
	ActivoFijoDuplicadoError,
	CATEGORIAS_EQUIPO,
	DUENO_PROPIO,
	type Equipo,
	type EquipoDatos,
	type EquipoDatosInput,
	EquipoDatosSchema,
	ESTADO_INICIAL,
	ESTADOS_POR_PROPIEDAD,
	ETIQUETA_CATEGORIA,
	ETIQUETA_ESTADO_EQUIPO,
	PlacaDuplicadaError,
	type PropiedadEquipo,
} from "../domain/equipo";

// Valor del selector para "H&M (propio)"; los demás valores son ids de proveedores.
const PROPIO = "__propio__";

const VACIO: EquipoDatosInput = {
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
	estado: ESTADO_INICIAL.PROPIO,
	// La mayoría de la maquinaria es de H&M.
	propiedad: "PROPIO",
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
		activoFijo: _a,
		...datos
	} = equipo;

	return datos;
}

const OPCIONES_CATEGORIA = CATEGORIAS_EQUIPO.map((categoria) => ({
	value: categoria,
	label: ETIQUETA_CATEGORIA[categoria],
}));
const opcionesEstado = (propiedad: PropiedadEquipo) =>
	ESTADOS_POR_PROPIEDAD[propiedad].map((estado) => ({
		value: estado,
		label: `${estado} · ${ETIQUETA_ESTADO_EQUIPO[estado]}`,
	}));
const mayus = "uppercase placeholder:normal-case";

// Activo fijo que tendrá el equipo: el suyo, o el siguiente del dueño elegido (HM001, HQA002…).
function vistaActivoFijo({
	equipo,
	duenos,
	activosFijos,
	propiedad,
	duenoId,
}: {
	equipo?: Equipo;
	duenos: readonly Tercero[];
	activosFijos: readonly string[];
	propiedad: PropiedadEquipo;
	duenoId: string;
}): { codigo: string; ayuda: string } {
	if (
		equipo &&
		equipo.propiedad === propiedad &&
		(propiedad === "PROPIO" || equipo.duenoId === duenoId)
	) {
		return { codigo: equipo.activoFijo, ayuda: "Código del equipo; no cambia." };
	}
	const dueno = duenos.find((tercero) => tercero.id === duenoId);
	const prefijo =
		propiedad === "PROPIO"
			? PREFIJO_PROPIO
			: dueno && (dueno.prefijoEquipos || sugerirPrefijo(dueno.razonSocial));
	if (!prefijo) {
		return { codigo: "", ayuda: "Se asigna al guardar, según el dueño." };
	}
	const codigo = siguienteActivoFijo(prefijo, activosFijos);

	return {
		codigo,
		ayuda: equipo
			? `Cambia a ${codigo} por el nuevo dueño.`
			: `Automático: ${prefijo} (${propiedad === "PROPIO" ? "H&M" : "código del proveedor"}) + número.`,
	};
}

function Formulario({
	equipo,
	duenos,
	activosFijos,
	open,
	onOpenChange,
}: {
	equipo?: Equipo;
	duenos: readonly Tercero[];
	activosFijos: readonly string[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { user } = useSession();
	const {
		register,
		control,
		handleSubmit,
		setError,
		setValue,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<EquipoDatosInput, unknown, EquipoDatos>({
		resolver: zodResolver(EquipoDatosSchema),
		defaultValues: aFormulario(equipo),
	});
	// Primero la maquinaria de H&M; luego los proveedores activos.
	const opcionesDueno = [
		{ value: PROPIO, label: DUENO_PROPIO },
		...duenos.map((dueno) => ({ value: dueno.id, label: dueno.razonSocial })),
	];
	const propiedad = useWatch({ control, name: "propiedad" });
	const duenoId = useWatch({ control, name: "duenoId" });
	const activoFijo = vistaActivoFijo({ equipo, duenos, activosFijos, propiedad, duenoId });

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
				toast.error(
					`El activo fijo ${error.activoFijo} ya existe en otro dispositivo. Sincroniza e inténtalo de nuevo.`,
				);

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
				<FormField label="Activo fijo" hint={activoFijo.ayuda}>
					{(campo) => (
						<Input
							{...campo}
							value={activoFijo.codigo}
							readOnly
							placeholder="Elige el dueño"
							className="font-medium tabular-nums text-navy-700"
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
						<SelectField
							{...campo}
							// "H&M (propio)" o el proveedor: un solo selector para los dos datos.
							value={propiedad === "PROPIO" ? PROPIO : duenoId}
							onChange={(valor) => {
								const opciones = { shouldDirty: true, shouldValidate: true };
								const nueva = valor === PROPIO ? "PROPIO" : "PROVEEDOR";
								setValue("propiedad", nueva, opciones);
								setValue("duenoId", valor === PROPIO ? "" : valor, opciones);
								// Al pasar de propio a proveedor (o al revés) cambia la lista de estados.
								if (!ESTADOS_POR_PROPIEDAD[nueva].includes(getValues("estado"))) {
									setValue("estado", ESTADO_INICIAL[nueva], opciones);
								}
							}}
							options={opcionesDueno}
							placeholder="Seleccionar dueño"
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
									options={opcionesEstado(propiedad)}
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
	activosFijos,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipo?: Equipo;
	duenos: readonly Tercero[];
	activosFijos: readonly string[];
}) {
	return open ? (
		<Formulario
			key={equipo?.id ?? "nuevo"}
			open={open}
			onOpenChange={onOpenChange}
			equipo={equipo}
			duenos={duenos}
			activosFijos={activosFijos}
		/>
	) : null;
}
