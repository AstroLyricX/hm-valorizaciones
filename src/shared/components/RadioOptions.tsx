import { cn } from "@/lib/utils";

import type { Opcion } from "./SelectField";

// Opciones en línea con círculo (por ejemplo Estado: Activo / Inactivo).
export function RadioOptions({
	name,
	value,
	onChange,
	options,
	label,
}: {
	name: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly Opcion[];
	label: string;
}) {
	return (
		<fieldset className="flex flex-col gap-1.5">
			<legend className="mb-1.5 text-[13px] font-medium text-navy-500">{label}</legend>
			<div className="flex h-10 items-center gap-6">
				{options.map((opcion) => (
					<label
						key={opcion.value}
						className="flex cursor-pointer items-center gap-2 text-sm text-navy-700"
					>
						<input
							type="radio"
							name={name}
							value={opcion.value}
							checked={value === opcion.value}
							onChange={() => onChange(opcion.value)}
							className="peer sr-only"
						/>
						<span
							aria-hidden="true"
							className={cn(
								"flex size-[18px] items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
								value === opcion.value ? "border-brand-600" : "border-navy-200 bg-navy-50",
							)}
						>
							{value === opcion.value && <span className="size-2 rounded-full bg-brand-600" />}
						</span>
						{opcion.label}
					</label>
				))}
			</div>
		</fieldset>
	);
}
