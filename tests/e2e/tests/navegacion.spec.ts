const SECCIONES = ["Valorizaciones", "Contratos", "Equipos", "Clientes", "Configuración", "Inicio"];

function tituloDe(seccion: string): string | RegExp {
	return seccion === "Inicio" ? /Hola,/ : seccion;
}

function iniciarSesion() {
	cy.visit("/");
	cy.findByRole("button", { name: "Continuar con Microsoft" }).click();
	cy.findByRole("heading", { level: 1, name: /Hola,/ }).should("exist");
}

describe("Navegación en escritorio", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
	});

	it("recorre las 6 secciones desde el menú lateral", () => {
		SECCIONES.forEach((seccion) => {
			cy.get("[data-sidebar=sidebar]").findByRole("link", { name: seccion }).click();
			cy.findByRole("heading", { level: 1, name: tituloDe(seccion) }).should("exist");
		});
	});

	it("abre la nueva valorización desde la cabecera", () => {
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Contratos" }).click();
		cy.get("header")
			.findByRole("link", { name: /Nueva valorización/ })
			.click();
		cy.findByRole("heading", { level: 1, name: "Nueva valorización" }).should("exist");
	});
});

describe("Navegación en celular", () => {
	beforeEach(() => {
		cy.viewport(390, 844);
		iniciarSesion();
	});

	it("recorre las secciones de la barra inferior y del menú Más", () => {
		["Valorizaciones", "Contratos", "Equipos", "Inicio"].forEach((seccion) => {
			cy.findByRole("navigation", { name: "Menú principal" })
				.findByRole("link", { name: seccion })
				.click();
			cy.findByRole("heading", { level: 1, name: tituloDe(seccion) }).should("exist");
		});

		["Clientes", "Configuración"].forEach((seccion) => {
			cy.findByRole("button", { name: "Más" }).click();
			cy.findByRole("dialog").findByRole("link", { name: seccion }).click();
			cy.findByRole("heading", { level: 1, name: tituloDe(seccion) }).should("exist");
		});
	});

	it("abre la nueva valorización desde Inicio", () => {
		cy.get("main").findByRole("link", { name: "Nueva valorización" }).click();
		cy.findByRole("heading", { level: 1, name: "Nueva valorización" }).should("exist");
	});
});
