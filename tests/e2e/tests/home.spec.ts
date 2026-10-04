describe("Login", () => {
	it("inicia sesión y muestra la página de inicio", () => {
		cy.visit("/");
		cy.findByRole("heading", { name: "Iniciar sesión" }).should("exist");
		cy.findByRole("button", { name: "Continuar con Microsoft" }).click();
		cy.findByRole("heading", { name: "Valorizaciones H&M" }).should("exist");
	});
});
