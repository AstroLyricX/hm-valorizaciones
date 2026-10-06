import { registrarContratoDelXlsm } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

describe("Valorizaciones", () => {
	beforeEach(() => {
		cy.viewport(1366, 900);
		iniciarSesion();
		registrarContratoDelXlsm();
	});

	it("crea un borrador, avisa el exceso de horas y conserva lo escrito", () => {
		cy.visit("/valorizaciones/nueva");
		cy.findByLabelText(/Contrato/).click();
		cy.findByRole("option", { name: /CTR-001/ }).click();
		cy.findByLabelText(/Periodo/).click();
		cy.findByRole("option", { name: "Agosto" }).click();
		cy.findByLabelText("Año del periodo").click();
		cy.findByRole("option", { name: "2026" }).click();
		cy.findByRole("button", { name: "Continuar con la planilla" }).click();

		cy.findByRole("heading", { level: 1, name: "Valorización · Agosto 2026" }).should("exist");
		cy.findAllByLabelText("Horas del periodo del ítem 1").filter(":visible").clear();
		cy.findAllByLabelText("Horas del periodo del ítem 1").filter(":visible").type("160");
		cy.findByRole("alert").should("contain.text", "160.00 h de 150.00 h");
		cy.findByRole("region", { name: "Planilla de medición" }).should(
			"contain.text",
			"USD 7,520.00",
		);
		cy.findByText("Guardado en este equipo").should("exist");

		cy.reload();
		cy.findAllByLabelText("Horas del periodo del ítem 1")
			.filter(":visible")
			.should("have.value", "160");
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Valorizaciones" }).click();
		cy.findByRole("table").findByText("Agosto 2026").should("exist");
	});
});
