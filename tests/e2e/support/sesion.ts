export function iniciarSesion(): void {
	cy.visit("/");
	cy.findByRole("button", { name: "Continuar con Microsoft" }).click();
	cy.findByRole("heading", { level: 1, name: /Hola,/ }).should("exist");
}
