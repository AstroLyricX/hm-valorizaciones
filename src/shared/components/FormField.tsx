import { type ReactNode, useId } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CampoProps {
	id: string;
	"aria-invalid": boolean;
	"aria-required"?: boolean;
	"aria-describedby"?: string;
}

// Campo de formulario: etiqueta (con * si es obligatorio), control, ayuda y error accesibles.
export function FormField({
	label,
	required = false,
	hint,
	error,
	className,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	error?: string;
	className?: string;
	children: (props: CampoProps) => ReactNode;
}) {
	const id = useId();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={id} className="text-[13px] font-medium text-navy-500">
				{label}
				{required && (
					<span aria-hidden="true" className="-ml-1 text-red-500">
						*
					</span>
				)}
			</Label>
			{children({
				id,
				"aria-invalid": Boolean(error),
				"aria-required": required || undefined,
				"aria-describedby": describedBy || undefined,
			})}
			{error ? (
				<p id={errorId} className="text-xs text-destructive">
					{error}
				</p>
			) : (
				hint && (
					<p id={hintId} className="text-xs text-navy-400">
						{hint}
					</p>
				)
			)}
		</div>
	);
}
