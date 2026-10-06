import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { CampoProps } from "./FormField";

export interface Opcion {
	value: string;
	label: string;
}

// Selector propio (no el del navegador): se ve igual en escritorio y celular.
export function SelectField({
	value,
	onChange,
	options,
	placeholder = "Seleccionar",
	disabled,
	className,
	...campo
}: Partial<CampoProps> & {
	"aria-label"?: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly Opcion[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<Select
			items={options}
			value={value === "" ? null : value}
			onValueChange={(nuevo) => onChange(typeof nuevo === "string" ? nuevo : "")}
			disabled={disabled}
		>
			<SelectTrigger
				{...campo}
				className={cn(
					"w-full rounded-lg border-navy-100 bg-navy-50/70 px-3 data-[size=default]:h-10 text-sm text-navy-900 data-placeholder:text-navy-400 data-popup-open:border-ring data-popup-open:bg-white",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="max-h-72">
				{options.map((opcion) => (
					<SelectItem key={opcion.value} value={opcion.value}>
						{opcion.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
