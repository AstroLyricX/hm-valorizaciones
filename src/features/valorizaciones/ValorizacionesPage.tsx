import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/shared/components/EmptyState";
import { NuevaValorizacionButton } from "@/shared/components/NuevaValorizacionButton";
import { PageHeader } from "@/shared/components/PageHeader";

export function ValorizacionesPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Valorizaciones"
				description="Historial de valorizaciones emitidas y borradores."
				actions={<NuevaValorizacionButton className="md:hidden" />}
			/>
			<EmptyState
				icon={ClipboardList}
				title="No hay valorizaciones"
				description="Las valorizaciones emitidas aparecerán aquí con su número, periodo y monto."
			/>
		</div>
	);
}
