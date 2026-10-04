describe("Página de inicio", () => {
	it("carga correctamente", () => {
		cy.visit("/");
		cy.findByRole("heading", { name: "Valorizaciones H&M" }).should("exist");
	});
});
