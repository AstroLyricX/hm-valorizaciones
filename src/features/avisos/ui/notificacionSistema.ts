import { ruta } from "@/app/entorno";

import { type Aviso, resumenNotificacion } from "../domain/avisos";

export function notificacionesDisponibles(): boolean {
	return typeof window !== "undefined" && "Notification" in window;
}

export function permisoNotificaciones(): NotificationPermission | "no-disponible" {
	return notificacionesDisponibles() ? Notification.permission : "no-disponible";
}

// Notificación del sistema (Windows, Android, macOS). Se muestra desde el service worker
// porque Android no permite crearla desde la página; al tocarla se abre la pantalla del aviso.
export async function notificar(nuevos: readonly Aviso[]): Promise<void> {
	if (nuevos.length === 0 || permisoNotificaciones() !== "granted") {
		return;
	}
	const { titulo, cuerpo } = resumenNotificacion(nuevos);
	const opciones: NotificationOptions = {
		body: cuerpo,
		icon: ruta("pwa-192x192.png"),
		tag: "hm-avisos",
		data: { url: ruta(nuevos.length === 1 ? nuevos[0].ruta.slice(1) : "") },
	};
	const registro =
		"serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
	if (registro) {
		await registro.showNotification(titulo, opciones);
	} else {
		new Notification(titulo, opciones);
	}
}
