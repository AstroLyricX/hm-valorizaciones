import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
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
import { useSession } from "@/features/auth/useSession";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FormField } from "@/shared/components/FormField";

import { terceroService } from "../application/terceroService.instance";
import {
	ETIQUETA_TIPO,
	RucDuplicadoError,
	type Tercero,
	type TerceroDatos,
	type TerceroDatosInput,
	TerceroDatosSchema,
	TIPOS_TERCERO,
} from "../domain/tercero";

const VACIO: TerceroDatosInput = {
	tipo: "CLIENTE",
	razonSocial: "",
	ruc: "",
	direccion: "",
	contacto: "",
	telefono: "",
	correo: "",
};

function aFormulario(tercero?: Tercero): TerceroDatosInput {
	if (!tercero) {
		return VACIO;
	}
	const { tipo, razonSocial, ruc, direccion, contacto, telefono, correo } = tercero;

	return { tipo, razonSocial, ruc, direccion, contacto, telefono, correo };
}

function TerceroForm({ tercero, onDone }: { tercero?: Tercero; onDone: () => void }) {
	const { user } = useSession();
	const esEdicion = Boolean(tercero);
	const {
		register,
		handleSubmit,
		setError,
		control,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<TerceroDatosInput, unknown, TerceroDatos>({
		resolver: zodResolver(TerceroDatosSchema),
		defaultValues: aFormulario(tercero),
	});
	const tipo = useWatch({ control, name: "tipo" });

	const guardar = async (datos: TerceroDatos) => {
		const usuario = user?.email ?? "desconocido";
		try {
			if (tercero) {
				await terceroService.actualizar(tercero.id, datos, usuario);
				toast.success("Cambios guardados.");
			} else {
				const creado = await terceroService.crear(datos, usuario);
				toast.success(`${ETIQUETA_TIPO[creado.tipo]} ${creado.codigo} registrado.`);
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

	return (
		<form
			noValidate
			onSubmit={(event) => void handleSubmit(guardar)(event)}
			className="flex min-h-0 flex-1 flex-col"
		>
			<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
				<fieldset className="flex flex-col gap-1.5">
					<legend className="mb-1.5 text-sm font-medium text-navy-700">Tipo</legend>
					<div className="grid grid-cols-2 gap-1 rounded-lg bg-navy-50 p-1">
						{TIPOS_TERCERO.map((opcion) => (
							<label
								key={opcion}
								className={cn(
									"flex h-9 cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
									tipo === opcion
										? "bg-white text-brand-700 shadow-sm"
										: "text-navy-500 hover:text-navy-900",
								)}
							>
								<input
									type="radio"
									value={opcion}
									checked={tipo === opcion}
									onChange={() => setValue("tipo", opcion, { shouldDirty: true })}
									className="sr-only"
								/>
								{ETIQUETA_TIPO[opcion]}
							</label>
						))}
					</div>
				</fieldset>
				<FormField label="Razón social o nombre" error={errors.razonSocial?.message}>
					{(field) => <Input {...field} {...register("razonSocial")} className="h-10 uppercase" />}
				</FormField>
				<FormField label="RUC" error={errors.ruc?.message} hint="11 dígitos.">
					{(field) => (
						<Input
							{...field}
							{...register("ruc")}
							inputMode="numeric"
							maxLength={11}
							className="h-10 tabular-nums"
						/>
					)}
				</FormField>
				<FormField label="Dirección" error={errors.direccion?.message} hint="Opcional.">
					{(field) => <Input {...field} {...register("direccion")} className="h-10" />}
				</FormField>
				<div className="grid gap-4 sm:grid-cols-2">
					<FormField label="Contacto" error={errors.contacto?.message} hint="Opcional.">
						{(field) => <Input {...field} {...register("contacto")} className="h-10" />}
					</FormField>
					<FormField label="Teléfono" error={errors.telefono?.message} hint="Opcional.">
						{(field) => (
							<Input {...field} {...register("telefono")} inputMode="tel" className="h-10" />
						)}
					</FormField>
				</div>
				<FormField label="Correo" error={errors.correo?.message} hint="Opcional.">
					{(field) => (
						<Input
							{...field}
							{...register("correo")}
							type="email"
							inputMode="email"
							className="h-10"
						/>
					)}
				</FormField>
			</div>
			<SheetFooter className="flex-row justify-end gap-2 border-t border-navy-100 bg-navy-50/60 px-6 py-4">
				<Button type="button" variant="outline" className="h-9 px-3.5" onClick={onDone}>
					Cancelar
				</Button>
				<Button type="submit" className="h-9 px-3.5" disabled={isSubmitting}>
					{isSubmitting && <LoaderCircle className="animate-spin" />}
					{esEdicion ? "Guardar cambios" : "Registrar"}
				</Button>
			</SheetFooter>
		</form>
	);
}

export function TerceroFormSheet({
	open,
	onOpenChange,
	tercero,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tercero?: Tercero;
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
						{tercero ? `Editar ${tercero.codigo}` : "Registrar cliente o proveedor"}
					</SheetTitle>
					<SheetDescription>
						{tercero
							? "Actualiza los datos. Los contratos existentes no se modifican."
							: "El código se asigna automáticamente al registrar."}
					</SheetDescription>
				</SheetHeader>
				{open && (
					<TerceroForm
						key={tercero?.id ?? "nuevo"}
						tercero={tercero}
						onDone={() => onOpenChange(false)}
					/>
				)}
			</SheetContent>
		</Sheet>
	);
}
