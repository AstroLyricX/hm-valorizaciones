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

// "1 ago. 2026": para tablas y fichas.
export function formatearFechaCorta(iso: string): string {
	return format(parseISO(iso), "d MMM yyyy", { locale: es });
}

// "01/08/2026": para columnas de tablas.
export function formatearFechaNumerica(iso: string): string {
	return format(parseISO(iso), "dd/MM/yyyy", { locale: es });
}
