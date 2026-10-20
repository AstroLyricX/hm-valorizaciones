import { registrarContratoDelXlsm } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

describe("Valorizaciones", () => {
	beforeEach(() => {
		cy.viewport(1366, 900);
		iniciarSesion();
		registrarContratoDelXlsm();
	});

	it("crea un borrador, avisa las horas bajo el mínimo, conserva lo escrito y lo emite", () => {
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
		cy.findAllByLabelText("Horas del periodo del ítem 1").filter(":visible").type("120");
		cy.findByRole("alert").should("contain.text", "120.00 h de 150.00 h (faltan 30.00 h)");
		cy.findByRole("region", { name: "Planilla de medición" }).should(
			"contain.text",
			"USD 5,640.00",
		);
		cy.findByText("Guardado en este equipo").should("exist");

		cy.reload();
		cy.findAllByLabelText("Horas del periodo del ítem 1")
			.filter(":visible")
			.should("have.value", "120");
		cy.findByRole("button", { name: "Emitir valorización" }).click();
		cy.findByRole("alertdialog").should(
			"contain.text",
			"un equipo tiene menos horas que las horas mínimas",
		);
		cy.findByRole("alertdialog").findByRole("button", { name: "Emitir" }).click();
		cy.findByText(`Valorización 0001-${new Date().getFullYear()} emitida.`).should("exist");
		cy.findAllByLabelText("Horas del periodo del ítem 1").filter(":visible").should("be.disabled");

		// El número toma el año de emisión (hoy).
		const archivo = `VAL-0001-${new Date().getFullYear()}-CTR-001.pdf`;
		cy.findByRole("button", { name: "Descargar PDF" }).click();
		cy.readFile(`${Cypress.config("downloadsFolder")}/${archivo}`, "binary", {
			timeout: 40000,
		}).should("match", /^%PDF-/);

		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Valorizaciones" }).click();
		cy.findByRole("table").findByText("Agosto 2026").should("exist");
		cy.findByRole("table").findByText("USD 6,655.20").should("exist");
	});
});
