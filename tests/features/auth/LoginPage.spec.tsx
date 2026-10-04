import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";

import { routes } from "../../../src/app/routes";
import { SessionProvider } from "../../../src/features/auth/SessionProvider";

function renderAt(path: string) {
	const router = createMemoryRouter(routes, { initialEntries: [path] });

	render(
		<SessionProvider>
			<RouterProvider router={router} />
		</SessionProvider>,
	);
}

beforeEach(() => {
	localStorage.clear();
});

test("muestra el botón para continuar con Microsoft", async () => {
	renderAt("/login");

	expect(await screen.findByRole("button", { name: "Continuar con Microsoft" })).toBeEnabled();
});

test("al iniciar sesión lleva a la página de inicio", async () => {
	const user = userEvent.setup();
	renderAt("/");

	await user.click(await screen.findByRole("button", { name: "Continuar con Microsoft" }));

	expect(
		await screen.findByRole("heading", { name: "Valorizaciones H&M" }, { timeout: 2000 }),
	).toBeInTheDocument();
});

test("recuerda la sesión iniciada", async () => {
	localStorage.setItem("hm.session", JSON.stringify({ name: "Ana", email: "ana@hm.pe" }));
	renderAt("/login");

	expect(await screen.findByText(/Hola, Ana/)).toBeInTheDocument();
});
