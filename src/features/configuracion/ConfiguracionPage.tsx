import { Pencil, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageHeader } from "@/shared/components/PageHeader";
import { avisarProximamente } from "@/shared/lib/proximamente";

export function ConfiguracionPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Configuración"
				description="Datos de la empresa que se muestran en las valorizaciones e IGV aplicable."
				actions={
					<Button
						variant="outline"
						className="h-9 px-3.5"
						onClick={() => avisarProximamente("Editar datos de la empresa")}
					>
						<Pencil />
						Editar
					</Button>
				}
			/>
			<EmptyState
				icon={Settings}
				title="Datos de la empresa"
				description="Razón social, RUC, dirección, teléfono e IGV de Maquinarias y Contratistas Generales H&M E.I.R.L."
			/>
		</div>
	);
}
