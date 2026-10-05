import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/useSession";
import { useIsMobile } from "@/hooks/use-mobile";
import { FormField } from "@/shared/components/FormField";
import { NativeSelect } from "@/shared/components/NativeSelect";

import { PlacaDuplicadaError } from "../application/EquipoService";
import { equipoService } from "../application/equipoService.instance";
import {
	type Equipo,
	type EquipoDatos,
	type EquipoDatosInput,
	EquipoDatosSchema,
	ESTADOS_EQUIPO,
	ETIQUETA_ESTADO_EQUIPO,
	TIPOS_SUGERIDOS,
} from "../domain/equipo";

const VACIO: EquipoDatosInput = {
	tipo: "",
	marca: "",
	modelo: "",
	serie: "",
	placa: "",
	anio: "",
	propietario: "",
	horometro: "",
	estado: "OPERATIVO",
	ubicacion: "",
	observaciones: "",
};

function aFormulario(equipo?: Equipo): EquipoDatosInput {
	if (!equipo) {
		return VACIO;
	}
	const {
		id: _id,
		codigo: _codigo,
		createdAt: _c,
		updatedAt: _u,
		updatedBy: _b,
		deletedAt: _d,
		version: _v,
		...datos
	} = equipo;

	return datos;
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
	return (
		<fieldset className="grid gap-4 sm:grid-cols-2">
			<legend className="mb-3 text-xs font-semibold tracking-wide text-navy-400 uppercase">
				{titulo}
			</legend>
			{children}
		</fieldset>
	);
}

function EquipoForm({ equipo, onDone }: { equipo?: Equipo; onDone: () => void }) {
	const { user } = useSession();
	const tiposId = useId();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<EquipoDatosInput, unknown, EquipoDatos>({
		resolver: zodResolver(EquipoDatosSchema),
		defaultValues: aFormulario(equipo),
	});

	const guardar = async (datos: EquipoDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (equipo) {
				await equipoService.actualizar(equipo.id, datos, usuario);
				toast.success("Cambios guardados.");
			} else {
				const creado = await equipoService.crear(datos, usuario);
				toast.success(`Equipo ${creado.codigo} registrado.`);
			}
			onDone();
		} catch (error) {
			if (error instanceof PlacaDuplicadaError) {
				setError("placa", {
					message: `Esta placa ya está registrada en ${error.codigoExistente}.`,
				});

				return;
			}
			toast.error("No se pudo guardar. Inténtalo de nuevo.");
		}
	};

	return (
		<form
			noValidate
			onSubmit={(event) => void handleSubmit(guardar)(event)}
			className="flex min-h-0 flex-1 flex-col"
		>
			<div className="flex flex-1 flex-col gap-7 overflow-y-auto px-6 py-5">
				<Grupo titulo="Identificación">
					<FormField label="Tipo de equipo" error={errors.tipo?.message} className="sm:col-span-2">
						{(field) => (
							<div className="relative">
								<Input
									{...field}
									{...register("tipo")}
									list={tiposId}
									className="h-10 pr-9 uppercase [&::-webkit-calendar-picker-indicator]:opacity-0"
								/>
								<ChevronDown
									className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-navy-400"
									aria-hidden="true"
								/>
								<datalist id={tiposId}>
									{TIPOS_SUGERIDOS.map((tipo) => (
										<option key={tipo} value={tipo} />
									))}
								</datalist>
							</div>
						)}
					</FormField>
					<FormField label="Marca" error={errors.marca?.message}>
						{(field) => <Input {...field} {...register("marca")} className="h-10 uppercase" />}
					</FormField>
					<FormField label="Modelo" error={errors.modelo?.message}>
						{(field) => <Input {...field} {...register("modelo")} className="h-10 uppercase" />}
					</FormField>
					<FormField label="Placa" error={errors.placa?.message} hint="Opcional.">
						{(field) => <Input {...field} {...register("placa")} className="h-10 uppercase" />}
					</FormField>
					<FormField label="Serie" error={errors.serie?.message} hint="Opcional.">
						{(field) => <Input {...field} {...register("serie")} className="h-10 uppercase" />}
					</FormField>
					<FormField label="Año" error={errors.anio?.message} hint="Opcional.">
						{(field) => (
							<Input
								{...field}
								{...register("anio")}
								inputMode="numeric"
								maxLength={4}
								className="h-10 tabular-nums"
							/>
						)}
					</FormField>
				</Grupo>

				<Grupo titulo="Operación">
					<FormField label="Estado" error={errors.estado?.message}>
						{(field) => (
							<NativeSelect {...field} {...register("estado")}>
								{ESTADOS_EQUIPO.map((estado) => (
									<option key={estado} value={estado}>
										{ETIQUETA_ESTADO_EQUIPO[estado]}
									</option>
								))}
							</NativeSelect>
						)}
					</FormField>
					<FormField
						label="Horómetro"
						error={errors.horometro?.message}
						hint="Horas acumuladas. Opcional."
					>
						{(field) => (
							<div className="relative">
								<Input
									{...field}
									{...register("horometro")}
									inputMode="decimal"
									className="h-10 pr-8 tabular-nums"
								/>
								<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
									h
								</span>
							</div>
						)}
					</FormField>
					<FormField
						label="Propietario"
						error={errors.propietario?.message}
						hint="Opcional. Déjalo vacío si es de H&M."
						className="sm:col-span-2"
					>
						{(field) => <Input {...field} {...register("propietario")} className="h-10" />}
					</FormField>
					<FormField
						label="Ubicación"
						error={errors.ubicacion?.message}
						hint="Obra o lugar donde está. Opcional."
						className="sm:col-span-2"
					>
						{(field) => <Input {...field} {...register("ubicacion")} className="h-10" />}
					</FormField>
					<FormField
						label="Observaciones"
						error={errors.observaciones?.message}
						className="sm:col-span-2"
					>
						{(field) => <Textarea {...field} {...register("observaciones")} rows={3} />}
					</FormField>
				</Grupo>
			</div>
			<SheetFooter className="flex-row justify-end gap-2 border-t border-navy-100 bg-navy-50/60 px-6 py-4">
				<Button type="button" variant="outline" className="h-9 px-3.5" onClick={onDone}>
					Cancelar
				</Button>
				<Button type="submit" className="h-9 px-3.5" disabled={isSubmitting}>
					{isSubmitting && <LoaderCircle className="animate-spin" />}
					{equipo ? "Guardar cambios" : "Registrar"}
				</Button>
			</SheetFooter>
		</form>
	);
}

export function EquipoFormSheet({
	open,
	onOpenChange,
	equipo,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipo?: Equipo;
}) {
	const isMobile = useIsMobile();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side={isMobile ? "bottom" : "right"}
				className="gap-0 data-[side=bottom]:max-h-[92svh] data-[side=bottom]:rounded-t-2xl data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
			>
				<SheetHeader className="border-b border-navy-100 px-6 py-5">
					<SheetTitle className="text-lg">
						{equipo ? `Editar ${equipo.codigo}` : "Registrar equipo"}
					</SheetTitle>
					<SheetDescription>
						{equipo
							? "Actualiza los datos o el estado del equipo."
							: "El código se asigna automáticamente al registrar."}
					</SheetDescription>
				</SheetHeader>
				{open && (
					<EquipoForm
						key={equipo?.id ?? "nuevo"}
						equipo={equipo}
						onDone={() => onOpenChange(false)}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
