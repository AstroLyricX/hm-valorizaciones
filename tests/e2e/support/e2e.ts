// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Las pruebas no dependen del servicio real de RUC (SUNAT): responde "no disponible" y el
// formulario sigue con la carga manual, haya o no un Worker configurado en .env.local.
beforeEach(() => {
	cy.intercept("GET", "**/ruc/*", { statusCode: 503, body: { error: "Sin servicio en pruebas." } });
});
