import { toast } from "sonner";

// Acciones cuya pantalla todavía no existe (llegan en las fases 2 a 7).
export function avisarProximamente(accion: string): void {
	toast.info(`"${accion}" estará disponible en la próxima actualización.`);
}
