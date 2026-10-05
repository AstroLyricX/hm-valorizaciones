import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function ahoraIso(): string {
	return new Date().toISOString();
}

export function formatearFecha(iso: string): string {
	return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatearFechaHora(iso: string): string {
	return format(parseISO(iso), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}
