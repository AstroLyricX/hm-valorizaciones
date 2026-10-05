import { WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

export function OfflineBanner({ className }: { className?: string }) {
	const isOnline = useOnlineStatus();

	if (isOnline) {
		return null;
	}

	return (
		<div
			role="status"
			className={cn(
				"flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900",
				className,
			)}
		>
			<WifiOff className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
			Sin conexión: tus cambios se guardan en este equipo.
		</div>
	);
}
