import {
	Building2,
	ClipboardList,
	FileSignature,
	House,
	type LucideIcon,
	Settings,
	Store,
	Truck,
} from "lucide-react";

import type { Rol } from "@/features/auth/SessionContext";

export interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
	// "bar": barra inferior en celular; "more": dentro del menú "Más".
	mobile: "bar" | "more";
	// Solo para administradores (decisión D2).
	soloAdmin?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
	{ to: "/", label: "Inicio", icon: House, mobile: "bar" },
	{ to: "/valorizaciones", label: "Valorizaciones", icon: ClipboardList, mobile: "bar" },
	{ to: "/contratos", label: "Contratos", icon: FileSignature, mobile: "bar" },
	{ to: "/equipos", label: "Equipos", icon: Truck, mobile: "bar" },
	{ to: "/clientes", label: "Clientes", icon: Building2, mobile: "more" },
	{ to: "/proveedores", label: "Proveedores", icon: Store, mobile: "more" },
	{ to: "/configuracion", label: "Configuración", icon: Settings, mobile: "more", soloAdmin: true },
];

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
	{ label: "General", items: NAV_ITEMS.slice(0, 3) },
	{ label: "Registros", items: NAV_ITEMS.slice(3, 6) },
	{ label: "Administración", items: NAV_ITEMS.slice(6) },
];

export function findNavItem(pathname: string): NavItem | undefined {
	return (
		NAV_ITEMS.find((item) => item.to !== "/" && isNavItemActive(item.to, pathname)) ??
		(pathname === "/" ? NAV_ITEMS[0] : undefined)
	);
}

// Opciones del menú que puede ver un usuario según su rol.
export function visiblePara(item: NavItem, rol: Rol | undefined): boolean {
	return item.soloAdmin !== true || rol === "ADMIN";
}

export const NUEVA_VALORIZACION_PATH = "/valorizaciones/nueva";

export function isNavItemActive(to: string, pathname: string): boolean {
	if (to === "/") {
		return pathname === "/";
	}

	return pathname === to || pathname.startsWith(`${to}/`);
}
