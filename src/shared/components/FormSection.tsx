import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Sección de formulario: título y descripción a la izquierda, campos a la derecha (en escritorio).
export function FormSection({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className="grid gap-5 border-b border-navy-100 px-5 py-6 last:border-b-0 md:grid-cols-[16rem_1fr] md:gap-8 md:px-6">
			<div className="flex flex-col gap-1">
				<h2 className="text-sm font-semibold text-navy-900">{title}</h2>
				<p className="text-[13px] text-muted-foreground">{description}</p>
			</div>
			<div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
		</section>
	);
}
