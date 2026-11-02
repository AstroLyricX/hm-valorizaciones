import { cn } from "@/lib/utils";

export interface OpcionMotivo<T extends string> {
	value: T;
	label: string;
	descripcion: string;
}

// Motivos como tarjetas para elegir (anular una valorización, registrar una adenda…).
export function OpcionesMotivo<T extends string>({
	name,
	value,
	onChange,
	opciones,
	error,
}: {
	name: string;
	value: T | "";
	onChange: (value: T) => void;
	opciones: readonly OpcionMotivo<T>[];
	error?: string;
}) {
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 text-[13px] font-medium text-navy-500">
				Motivo <span className="text-red-500">*</span>
			</legend>
			<div
				role="radiogroup"
				aria-label="Motivo"
				aria-invalid={error !== undefined}
				className="grid gap-2 sm:grid-cols-2"
			>
				{opciones.map((opcion) => {
					const elegido = value === opcion.value;

					return (
						<label
							key={opcion.value}
							className={cn(
								"flex cursor-pointer gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
								elegido
									? "border-brand-500 bg-brand-50/60"
									: "border-navy-100 hover:border-navy-200 hover:bg-navy-50/60",
							)}
						>
							<input
								type="radio"
								name={name}
								value={opcion.value}
								checked={elegido}
								onChange={() => onChange(opcion.value)}
								className="peer sr-only"
							/>
							<span
								aria-hidden="true"
								className={cn(
									"mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
									elegido ? "border-brand-600" : "border-navy-200 bg-navy-50",
								)}
							>
								{elegido && <span className="size-2 rounded-full bg-brand-600" />}
							</span>
							<span className="flex flex-col">
								<span className="text-sm font-medium text-navy-900">{opcion.label}</span>
								<span className="text-xs text-muted-foreground">{opcion.descripcion}</span>
							</span>
						</label>
					);
				})}
			</div>
			{error && <span className="text-xs text-destructive">{error}</span>}
		</fieldset>
	);
}
