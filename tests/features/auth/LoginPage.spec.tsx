import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderRoute, signInAs } from "../../support/renderRoute";

beforeEach(() => {
	localStorage.clear();
});

test("muestra el botón para continuar con Microsoft", async () => {
	renderRoute("/login");

	expect(await screen.findByRole("button", { name: "Continuar con Microsoft" })).toBeEnabled();
});

test("al iniciar sesión lleva a la página de inicio", async () => {
	const user = userEvent.setup();
	renderRoute("/");

	await user.click(await screen.findByRole("button", { name: "Continuar con Microsoft" }));

	expect(
		await screen.findByRole("heading", { level: 1, name: /Hola,/ }, { timeout: 2000 }),
	).toBeInTheDocument();
});

test("al iniciar sesión vuelve a la página que se quería abrir", async () => {
	const user = userEvent.setup();
	renderRoute("/contratos");

	await user.click(await screen.findByRole("button", { name: "Continuar con Microsoft" }));

	expect(
		await screen.findByRole("heading", { name: "Contratos" }, { timeout: 2000 }),
	).toBeInTheDocument();
});

test("recuerda la sesión iniciada", async () => {
	signInAs({ name: "Ana Quispe", email: "ana@hm.pe" });
	renderRoute("/login");

	expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
});

test("indica que se entra con la cuenta de H&M", async () => {
	renderRoute("/login");

	expect(await screen.findByText("(@maquinariashym.com)")).toBeInTheDocument();
	expect(screen.getByText(/Solo pueden entrar las cuentas de H&M/)).toBeInTheDocument();
});
