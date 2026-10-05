import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
	icon: Icon,
	title,
	description,
	children,
	className,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-4 rounded-xl border border-navy-100 bg-white px-6 py-14 shadow-[0_1px_3px_rgb(14_30_54/0.06)] text-center dark:bg-card",
				className,
			)}
		>
			<span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
				<Icon className="size-5" aria-hidden="true" />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold text-navy-900 dark:text-white">{title}</h2>
				<p className="max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
			</div>
			{children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
		</div>
	);
}
