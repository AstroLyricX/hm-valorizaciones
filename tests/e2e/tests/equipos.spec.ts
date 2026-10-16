import { abrirNuevo, datosDelEquipo, registrarProveedor, seleccionar } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

describe("Equipos", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		registrarProveedor("Huise Quea Antolin", "10098637074");
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Equipos" }).click();
	});

	it("registra un equipo y luego cambia su estado a falla mecánica", () => {
		abrirNuevo("Agregar equipo");
		datosDelEquipo({
			descripcion: "Excavadora",
			fabricante: "CAT",
			modelo: "340",
			placa: "EXC-340",
			dueno: "HUISE QUEA ANTOLIN",
		});
		// Activo fijo automático: el código del proveedor (iniciales) + número.
		cy.findByRole("dialog")
			.findByLabelText(/Activo fijo/)
			.should("have.value", "HQA001");
		cy.findByRole("dialog").findByRole("button", { name: "Guardar" }).click();
		cy.findByText("Equipo HQA001 registrado.").should("exist");
		cy.findByRole("table").findByText("EXCAVADORA CAT 340").should("exist");

		cy.findByRole("button", { name: "Editar HQA001" }).click();
		seleccionar(/^Estado/, /Falla mecánica/);
		cy.findByRole("dialog", { name: "Editar equipo HQA001" })
			.findByRole("button", { name: "Guardar" })
			.click();
		cy.get("tbody").findByText("Falla mecánica").should("exist");
	});
});
