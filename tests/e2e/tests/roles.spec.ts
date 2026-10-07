import { iniciarSesionComoOperador } from "../support/sesion";

describe("Roles", () => {
	it("un operador no ve ni abre Configuración", () => {
		cy.viewport(1280, 800);
		iniciarSesionComoOperador();

		cy.get("[data-sidebar=sidebar]")
			.findByRole("link", { name: "Configuración" })
			.should("not.exist");
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Clientes" }).should("exist");
		cy.visit("/configuracion");
		cy.findByRole("heading", { level: 1, name: "Hola, Luis" }).should("exist");
	});
});
