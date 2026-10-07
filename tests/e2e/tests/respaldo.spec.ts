import { registrarCliente } from "../support/datos";
import { iniciarSesion } from "../support/sesion";

function hoyLocal(): string {
	const ahora = new Date();
	const mes = String(ahora.getMonth() + 1).padStart(2, "0");
	const dia = String(ahora.getDate()).padStart(2, "0");

	return `${ahora.getFullYear()}-${mes}-${dia}`;
}

describe("Respaldo en Excel", () => {
	beforeEach(() => {
		cy.viewport(1280, 800);
		iniciarSesion();
		registrarCliente("Constructora Andina SAC", "20602629903");
	});

	it("descarga el Excel con los datos del dispositivo", () => {
		cy.get("[data-sidebar=sidebar]").findByRole("link", { name: "Configuración" }).click();
		cy.findByRole("button", { name: "Exportar a Excel" }).click();

		const archivo = `HM-valorizaciones-${hoyLocal()}.xlsx`;
		cy.findByText(`Se descargó ${archivo}.`).should("exist");
		// Un .xlsx es un ZIP: empieza con "PK".
		cy.readFile(`${Cypress.config("downloadsFolder")}/${archivo}`, "binary", {
			timeout: 15000,
		}).should("match", /^PK/);
	});
});
