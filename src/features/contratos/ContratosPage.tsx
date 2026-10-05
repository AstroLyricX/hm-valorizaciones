import { FileSignature, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";
import { avisarProximamente } from "@/shared/lib/proximamente";

export function ContratosPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Contratos"
				description="Contratos con sus ítems, montos contractuales y plazos."
				actions={
					<Button className="h-9 px-3.5" onClick={() => avisarProximamente("Nuevo contrato")}>
						<Plus />
						Nuevo contrato
					</Button>
				}
			/>
			<EmptyState
				icon={FileSignature}
				title="No hay contratos registrados"
				description="Crea un contrato con su cliente e ítems para empezar a valorizarlo."
			/>
		</div>
	);
}
