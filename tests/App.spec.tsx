import { render, screen } from "@testing-library/react";

import { App } from "../src/App";

beforeEach(() => {
	localStorage.clear();
});

test("sin sesión redirige a la página de login", async () => {
	render(<App />);

	expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
});
