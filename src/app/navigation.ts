import {
	Building2,
	ClipboardList,
	FileSignature,
	House,
	type LucideIcon,
	Settings,
	Truck,
} from "lucide-react";

export interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	// "bar": barra inferior en celular; "more": dentro del menú "Más".
	mobile: "bar" | "more";
}

export const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Inicio", icon: House, mobile: "bar" },
	{ to: "/valorizaciones", label: "Valorizaciones", icon: ClipboardList, mobile: "bar" },
	{ to: "/contratos", label: "Contratos", icon: FileSignature, mobile: "bar" },
	{ to: "/equipos", label: "Equipos", icon: Truck, mobile: "bar" },
	{ to: "/clientes", label: "Clientes", icon: Building2, mobile: "more" },
	{ to: "/configuracion", label: "Configuración", icon: Settings, mobile: "more" },
];

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
	{ label: "General", items: NAV_ITEMS.slice(0, 3) },
	{ label: "Registros", items: NAV_ITEMS.slice(3, 5) },
	{ label: "Administración", items: NAV_ITEMS.slice(5) },
];

export function findNavItem(pathname: string): NavItem | undefined {
	return (
		NAV_ITEMS.find((item) => item.to !== "/" && isNavItemActive(item.to, pathname)) ??
		(pathname === "/" ? NAV_ITEMS[0] : undefined)
	);
}

export const NUEVA_VALORIZACION_PATH = "/valorizaciones/nueva";

export function isNavItemActive(to: string, pathname: string): boolean {
	if (to === "/") {
		return pathname === "/";
	}

	return pathname === to || pathname.startsWith(`${to}/`);
}
