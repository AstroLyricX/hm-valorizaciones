import { abrirNuevo, datosDelCliente, seleccionar } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

describe("Clientes", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Clientes" }).click();
	});

	it("registra un cliente y luego lo edita", () => {
		abrirNuevo("Agregar cliente");
		datosDelCliente("Huise Quea Antolin", "10098637074");
		cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
		cy.findByText("Cliente CLI-001 registrado.").should("exist");
		cy.findByRole("table").findByText("HUISE QUEA ANTOLIN").should("exist");

		cy.findByRole("table").findByRole("button", { name: "Editar HUISE QUEA ANTOLIN" }).click();
		seleccionar(/Banco/, "BCP");
		cy.findByRole("dialog", { name: "Editar cliente CLI-001" })
			.findByRole("button", { name: "Guardar" })
			.click();
		cy.findByText("Cambios guardados.").should("exist");
		cy.findByRole("table").findByRole("button", { name: "Editar HUISE QUEA ANTOLIN" }).click();
		cy.findByRole("dialog").findByLabelText(/Banco/).should("contain.text", "BCP");
	});

	it("muestra un error si el RUC no es válido", () => {
		abrirNuevo("Agregar cliente");
		datosDelCliente("Cliente de prueba", "20123456789");
		cy.findByRole("dialog").within(() => {
			cy.findByRole("button", { name: "Guardar" }).click();
			cy.findByText("El RUC no es válido. Revisa los dígitos.").should("exist");
		});
	});
});
