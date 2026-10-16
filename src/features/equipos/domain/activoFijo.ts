import { siguienteCodigo } from "@/shared/domain/codigo";

// Activo fijo automático: letras del dueño + número correlativo de sus equipos.
// Propios de H&M: HM001, HM002… De un proveedor: su código de equipos (HQA001, HQA002…).
export const PREFIJO_PROPIO = "HM";

export function siguienteActivoFijo(prefijo: string, activosFijos: readonly string[]): string {
	return siguienteCodigo(prefijo, activosFijos);
}
