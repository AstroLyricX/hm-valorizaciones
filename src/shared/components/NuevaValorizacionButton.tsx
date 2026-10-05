import { Plus } from "lucide-react";
import { Link } from "react-router";

import { NUEVA_VALORIZACION_PATH } from "@/app/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NuevaValorizacionButton({ className }: { className?: string }) {
	return (
		<Link to={NUEVA_VALORIZACION_PATH} className={cn(buttonVariants(), "h-9 px-3.5", className)}>
			<Plus />
			Nueva valorización
		</Link>
	);
}
