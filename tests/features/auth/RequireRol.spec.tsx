import { screen } from "@testing-library/react";

import { renderRoute, signInAs } from "../../support/renderRoute";

const OPERADOR = { name: "Luis Mamani", email: "luis@hm.pe", rol: "OPERADOR" as const };

beforeEach(() => {
	localStorage.clear();
});

test("un operador no entra a Configuración y vuelve a Inicio", async () => {
	signInAs(OPERADOR);
	renderRoute("/configuracion");

	expect(await screen.findByRole("heading", { level: 1, name: "Hola, Luis" })).toBeInTheDocument();
	expect(
		screen.queryByRole("heading", { level: 1, name: "Configuración" }),
	).not.toBeInTheDocument();
});

test("el menú del operador no muestra Configuración", async () => {
	signInAs(OPERADOR);
	renderRoute("/");

	await screen.findByRole("heading", { level: 1, name: "Hola, Luis" });
	expect(screen.queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
	expect(screen.getAllByRole("link", { name: "Clientes" }).length).toBeGreaterThan(0);
});

test("un administrador sí entra a Configuración", async () => {
	signInAs();
	renderRoute("/configuracion");

	expect(
		await screen.findByRole("heading", { level: 1, name: "Configuración" }),
	).toBeInTheDocument();
});
