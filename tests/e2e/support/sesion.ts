// Cypress limpia cookies y localStorage entre pruebas, pero no IndexedDB:
// se borra la base local (Dexie cierra su conexión al recibir la solicitud) y se recarga.
function borrarBaseLocal(): void {
	cy.window().then(
		async (win) =>
			new Promise<void>((resolve, reject) => {
				const solicitud = win.indexedDB.deleteDatabase("hm-valorizaciones");
				solicitud.onsuccess = () => resolve();
				solicitud.onerror = () => reject(new Error("No se pudo borrar la base local."));
			}),
	);
	cy.reload();
}

export function iniciarSesion(): void {
	cy.visit("/");
	borrarBaseLocal();
	cy.findByRole("button", { name: "Continuar con Microsoft" }).click();
	cy.findByRole("heading", { level: 1, name: /Hola,/ }).should("exist");
}

// Sesión de un operador (en producción el rol llega del token de Microsoft Entra ID).
export function iniciarSesionComoOperador(): void {
	cy.visit("/");
	borrarBaseLocal();
	cy.window().then((win) => {
		win.localStorage.setItem(
			"hm.session",
			JSON.stringify({ name: "Luis Mamani", email: "luis@hm.pe", rol: "OPERADOR" }),
		);
	});
	cy.reload();
	cy.findByRole("heading", { level: 1, name: "Hola, Luis" }).should("exist");
}
