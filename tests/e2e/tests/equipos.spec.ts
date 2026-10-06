import { abrirNuevo, datosDelEquipo, registrarCliente, seleccionar } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

describe("Equipos", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		registrarCliente("Constructora Andina SAC", "20602629903");
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Equipos" }).click();
	});

	it("registra un equipo y luego cambia su estado a falla mecánica", () => {
		abrirNuevo("Agregar equipo");
		datosDelEquipo({
			activoFijo: "AF-001",
			descripcion: "Excavadora",
			fabricante: "CAT",
			modelo: "340",
			placa: "EXC-340",
			dueno: "CONSTRUCTORA ANDINA SAC",
		});
		cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
		cy.findByText("Equipo AF-001 registrado.").should("exist");
		cy.findByRole("table").findByText("EXCAVADORA CAT 340").should("exist");

		cy.findByRole("button", { name: "Editar AF-001" }).click();
		seleccionar(/^Estado/, /Falla mecánica/);
		cy.findByRole("dialog", { name: "Editar equipo AF-001" })
			.findByRole("button", { name: "Guardar" })
			.click();
		cy.get("tbody").findByText("Falla mecánica").should("exist");
	});
});
