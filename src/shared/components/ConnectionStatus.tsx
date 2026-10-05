import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

export function ConnectionStatus({ className }: { className?: string }) {
	const isOnline = useOnlineStatus();

	return (
		<span
			role="status"
			className={cn(
				"inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
				isOnline
					? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
					: "border-amber-200/70 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
				className,
			)}
		>
			<span className="relative flex size-1.5">
				{isOnline && (
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
				)}
				<span
					className={cn(
						"relative inline-flex size-1.5 rounded-full",
						isOnline ? "bg-emerald-500" : "bg-amber-500",
					)}
				/>
			</span>
			{isOnline ? "En línea" : "Sin conexión"}
		</span>
	);
}
