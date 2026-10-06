import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { es } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { CampoProps } from "./FormField";

// Años que ofrece el calendario: contratos desde 2000 hasta 10 años adelante.
const DESDE = new Date(2000, 0, 1);
const HASTA = new Date(new Date().getFullYear() + 10, 11, 31);

// Selector de fecha propio con calendario en español. Trabaja con fechas ISO ("2026-08-01").
export function DateField({
	value,
	onChange,
	placeholder = "dd/mm/aaaa",
	className,
	...campo
}: Partial<CampoProps> & {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}) {
	const [abierto, setAbierto] = useState(false);
	const fecha = value === "" ? undefined : parseISO(value);

	return (
		<Popover open={abierto} onOpenChange={setAbierto}>
			<PopoverTrigger
				{...campo}
				render={
					<button
						type="button"
						className={cn(
							"flex h-10 w-full items-center justify-between rounded-lg border border-navy-100 bg-navy-50/70 px-3 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive data-popup-open:border-ring data-popup-open:bg-white",
							fecha ? "text-navy-900" : "text-navy-400",
							className,
						)}
					/>
				}
			>
				{fecha ? format(fecha, "dd/MM/yyyy") : placeholder}
				<CalendarDays className="size-4 text-navy-400" aria-hidden="true" />
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					locale={es}
					selected={fecha}
					defaultMonth={fecha}
					captionLayout="dropdown"
					startMonth={DESDE}
					endMonth={HASTA}
					onSelect={(dia) => {
						onChange(dia ? format(dia, "yyyy-MM-dd") : "");
						setAbierto(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
