// Se agrega al service worker de la PWA (workbox.importScripts en vite.config.ts).
// Al tocar una notificación de avisos se abre la app en la pantalla del aviso.
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = new URL(event.notification.data?.url ?? "./", self.registration.scope).href;

	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
			const abierta = ventanas.find((ventana) => ventana.url.startsWith(self.registration.scope));
			if (abierta) {
				return abierta.focus().then((ventana) => ventana.navigate(url));
			}

			return self.clients.openWindow(url);
		}),
	);
});
