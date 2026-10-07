import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { RespaldoDatos } from "@/features/datos/ui/RespaldoDatos";
import { formatearFechaHora } from "@/lib/fechas";
import { FormField } from "@/shared/components/FormField";
import { FormSection } from "@/shared/components/FormSection";
import { PageHeader } from "@/shared/components/PageHeader";

import { empresaRepository, empresaService } from "./application/empresaService.instance";
import type { Empresa, EmpresaDatos } from "./domain/empresa";
import { aFormulario, type EmpresaFormInput, EmpresaFormSchema } from "./ui/empresaForm";

function EmpresaForm({ empresa }: { empresa: Empresa }) {
	const { user } = useSession();
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<EmpresaFormInput, unknown, EmpresaDatos>({
		resolver: zodResolver(EmpresaFormSchema),
		defaultValues: aFormulario(empresa),
	});

	const guardar = async (datos: EmpresaDatos) => {
		try {
			await empresaService.actualizar(datos, user?.email ?? "desconocido");
			toast.success("Datos de la empresa guardados.");
		} catch {
			toast.error("No se pudieron guardar los datos. Inténtalo de nuevo.");
		}
	};

	return (
		<form
			noValidate
			onSubmit={(event) => void handleSubmit(guardar)(event)}
			className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card"
		>
			<FormSection
				title="Datos de la empresa"
				description="Aparecen en el encabezado de cada valorización, como contratante."
			>
				<FormField
					label="Razón social"
					required
					error={errors.razonSocial?.message}
					className="sm:col-span-2"
				>
					{(field) => (
						<Input
							{...field}
							{...register("razonSocial")}
							placeholder="Ingresar razón social"
							className="h-10"
						/>
					)}
				</FormField>
				<FormField label="RUC" required error={errors.ruc?.message} hint="11 dígitos.">
					{(field) => (
						<Input
							{...field}
							{...register("ruc")}
							placeholder="Ingresar RUC"
							inputMode="numeric"
							maxLength={11}
							className="tabular-nums"
						/>
					)}
				</FormField>
				<FormField label="Teléfono" error={errors.telefono?.message}>
					{(field) => (
						<Input
							{...field}
							{...register("telefono")}
							placeholder="Ingresar teléfono"
							inputMode="tel"
							className="h-10"
						/>
					)}
				</FormField>
				<FormField
					label="Dirección legal"
					required
					error={errors.direccion?.message}
					className="sm:col-span-2"
				>
					{(field) => (
						<Input
							{...field}
							{...register("direccion")}
							placeholder="Ingresar dirección legal"
							className="h-10"
						/>
					)}
				</FormField>
			</FormSection>

			<FormSection
				title="Impuestos"
				description="El IGV se aplica al subtotal de las valorizaciones nuevas. Las ya emitidas conservan el suyo."
			>
				<FormField label="IGV" required error={errors.igvPorcentaje?.message}>
					{(field) => (
						<div className="relative">
							<Input
								{...field}
								{...register("igvPorcentaje")}
								placeholder="Ingresar IGV"
								inputMode="decimal"
								className="pr-9 tabular-nums"
							/>
							<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
								%
							</span>
						</div>
					)}
				</FormField>
			</FormSection>

			<div className="flex flex-col gap-3 border-t border-navy-100 bg-navy-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
				<p className="text-[13px] text-muted-foreground">
					Última actualización: {formatearFechaHora(empresa.updatedAt)}
					{empresa.updatedBy !== "sistema" && ` · ${empresa.updatedBy}`}
				</p>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="h-9 px-3.5"
						disabled={!isDirty || isSubmitting}
						onClick={() => reset()}
					>
						Descartar
					</Button>
					<Button type="submit" className="h-9 px-3.5" disabled={!isDirty || isSubmitting}>
						{isSubmitting && <LoaderCircle className="animate-spin" />}
						Guardar cambios
					</Button>
				</div>
			</div>
		</form>
	);
}

export function ConfiguracionPage() {
	const empresa = useLiveQuery(async () => empresaRepository.obtener());

	useEffect(() => {
		// La primera vez crea los datos con los valores de la hoja CONFIG del xlsm.
		void empresaService.obtener();
	}, []);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Configuración"
				description="Datos de la empresa que se muestran en las valorizaciones e IGV aplicable."
			/>
			{empresa ? (
				// Al guardarse una nueva versión el formulario se reinicia con los datos guardados.
				<EmpresaForm key={empresa.version} empresa={empresa} />
			) : (
				<div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
					<Skeleton className="h-64 w-full rounded-xl" />
					<Skeleton className="h-28 w-full rounded-xl" />
				</div>
			)}
			<RespaldoDatos />
		</div>
	);
}
