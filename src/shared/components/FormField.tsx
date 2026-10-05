import { type ReactNode, useId } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Campo de formulario con etiqueta, ayuda y mensaje de error accesibles.
export function FormField({
	label,
	hint,
	error,
	className,
	children,
}: {
	label: string;
	hint?: string;
	error?: string;
	className?: string;
	children: (props: {
		id: string;
		"aria-invalid": boolean;
		"aria-describedby"?: string;
	}) => ReactNode;
}) {
	const id = useId();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={id} className="text-navy-700">
				{label}
			</Label>
			{children({
				id,
				"aria-invalid": Boolean(error),
				"aria-describedby": describedBy || undefined,
			})}
			{error ? (
				<p id={errorId} className="text-[13px] text-destructive">
					{error}
				</p>
			) : (
				hint && (
					<p id={hintId} className="text-[13px] text-muted-foreground">
						{hint}
					</p>
				)
			)}
		</div>
	);
}
