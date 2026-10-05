import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// Selector nativo: en celular abre el selector del sistema, más cómodo de usar con el dedo.
export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
	return (
		<div className={cn("relative", className)}>
			<select
				{...props}
				className="h-10 w-full appearance-none rounded-lg border border-input bg-white pr-9 pl-3 text-sm text-navy-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
			>
				{children}
			</select>
			<ChevronDown
				className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-navy-400"
				aria-hidden="true"
			/>
		</div>
	);
}
