import { iniciarSesion } from "../support/sesion";

describe("Clientes", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Clientes" }).click();
	});

	it("registra un cliente y luego lo edita", () => {
		cy.findByRole("button", { name: "Agregar cliente" }).click();
		cy.findByRole("dialog").within(() => {
			cy.findByLabelText("Razón social o nombre").type("Huise Quea Antolin");
			cy.findByLabelText("RUC").type("10098637074");
			cy.findByLabelText("Teléfono").type("931 161 371");
			cy.findByRole("button", { name: "Registrar" }).click();
		});
		cy.findByText("Cliente CLI-001 registrado.").should("exist");
		cy.findByRole("table").findByText("HUISE QUEA ANTOLIN").should("exist");

		cy.findByRole("table").findByRole("button", { name: "Acciones de HUISE QUEA ANTOLIN" }).click();
		cy.findByRole("menuitem", { name: "Editar" }).click();
		cy.findByRole("dialog", { name: "Editar CLI-001" }).within(() => {
			cy.findByLabelText("Contacto").type("Antolín Huise");
			cy.findByRole("button", { name: "Guardar cambios" }).click();
		});
		cy.findByText("Cambios guardados.").should("exist");
		cy.findByRole("table").findByText("Antolín Huise").should("exist");
	});

	it("muestra un error si el RUC no es válido", () => {
		cy.findByRole("button", { name: "Agregar cliente" }).click();
		cy.findByRole("dialog").within(() => {
			cy.findByLabelText("Razón social o nombre").type("Cliente de prueba");
			cy.findByLabelText("RUC").type("20123456789");
			cy.findByRole("button", { name: "Registrar" }).click();
			cy.findByText("El RUC no es válido. Revisa los dígitos.").should("exist");
		});
	});
});
