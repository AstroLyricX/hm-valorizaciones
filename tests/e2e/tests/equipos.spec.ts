import { iniciarSesion } from "../support/sesion";

describe("Equipos", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Equipos" }).click();
	});

	it("registra un equipo y luego lo pone en mantenimiento", () => {
		cy.findByRole("button", { name: "Agregar equipo" }).click();
		cy.findByRole("dialog").within(() => {
			cy.findByLabelText("Tipo de equipo").type("Excavadora");
			cy.findByLabelText("Marca").type("CAT");
			cy.findByLabelText("Modelo").type("340");
			cy.findByLabelText("Placa").type("EXC-340");
			cy.findByLabelText("Horómetro").type("1250.5");
			cy.findByRole("button", { name: "Registrar" }).click();
		});
		cy.findByText("Equipo EQ-001 registrado.").should("exist");
		cy.findByRole("table").findByText("EXCAVADORA CAT 340").should("exist");

		cy.findByRole("button", { name: "Editar EXCAVADORA CAT 340" }).click();
		cy.findByRole("dialog", { name: "Editar EQ-001" }).within(() => {
			cy.findByLabelText("Estado").select("En mantenimiento");
			cy.findByRole("button", { name: "Guardar cambios" }).click();
		});
		cy.findByRole("table").findByText("En mantenimiento").should("exist");
	});
});
