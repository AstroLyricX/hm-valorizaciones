import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "brand" | "indigo";

const TONOS: Record<PillTone, { pill: string; dot: string }> = {
	success: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
	warning: { pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
	danger: { pill: "bg-red-50 text-red-700", dot: "bg-red-500" },
	neutral: { pill: "bg-navy-100 text-navy-600", dot: "bg-navy-400" },
	brand: { pill: "bg-brand-50 text-brand-700", dot: "bg-brand-500" },
	indigo: { pill: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
};

// Etiqueta de estado o categoría. Con `dot` muestra un punto de color (para estados).
export function Pill({
	tone,
	dot = false,
	children,
}: {
	tone: PillTone;
	dot?: boolean;
	children: ReactNode;
}) {
	return (
		<Badge
			variant="outline"
			className={cn("gap-1.5 border-transparent font-medium", TONOS[tone].pill)}
		>
			{dot && <span className={cn("size-1.5 rounded-full", TONOS[tone].dot)} />}
			{children}
		</Badge>
	);
}
