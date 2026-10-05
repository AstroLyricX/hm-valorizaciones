import { Building2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";
import { avisarProximamente } from "@/shared/lib/proximamente";

export function ClientesPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Clientes"
				description="Empresas y personas con las que H&M tiene contratos."
				actions={
					<Button className="h-9 px-3.5" onClick={() => avisarProximamente("Agregar cliente")}>
						<Plus />
						Agregar cliente
					</Button>
				}
			/>
			<EmptyState
				icon={Building2}
				title="No hay clientes registrados"
				description="Registra un cliente con su RUC para poder crear contratos a su nombre."
			/>
		</div>
	);
}
