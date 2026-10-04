import { render, screen } from "@testing-library/react";

import { App } from "../src/App";

test("muestra el título de la aplicación", () => {
	render(<App />);

	expect(screen.getByRole("heading", { name: "Valorizaciones H&M" })).toBeInTheDocument();
});
