import { Plus, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";
import { avisarProximamente } from "@/shared/lib/proximamente";

export function EquiposPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Equipos"
				description="Maquinaria con su estado, placa, horómetro y ubicación."
				actions={
					<Button className="h-9 px-3.5" onClick={() => avisarProximamente("Agregar equipo")}>
						<Plus />
						Agregar equipo
					</Button>
				}
			/>
			<EmptyState
				icon={Truck}
				title="No hay equipos registrados"
				description="Registra la maquinaria para asociarla a los ítems de los contratos."
			/>
		</div>
	);
}
