import { FileSignature } from "lucide-react";
import { Link } from "react-router";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";

export function NuevaValorizacionPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Nueva valorización"
				description="Selecciona un contrato e ingresa las cantidades del periodo."
			/>
			<EmptyState
				icon={FileSignature}
				title="No hay contratos activos"
				description="La planilla de medición se genera a partir de los ítems de un contrato activo."
			>
				<Link to="/contratos" className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}>
					Ir a contratos
				</Link>
			</EmptyState>
		</div>
	);
}
