import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderRoute, signInAs } from "../support/renderRoute";

const SECCIONES = ["Inicio", "Valorizaciones", "Contratos", "Equipos", "Clientes", "Configuración"];

beforeEach(() => {
	localStorage.clear();
});

test("una ruta protegida sin sesión redirige al login", async () => {
	renderRoute("/equipos");

	expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
});

test("el menú lateral muestra las 6 secciones", async () => {
	signInAs();
	renderRoute("/");

	await screen.findByRole("heading", { level: 1, name: /Hola,/ });
	for (const seccion of SECCIONES) {
		expect(screen.getAllByRole("link", { name: seccion }).length).toBeGreaterThan(0);
	}
});

test("la barra inferior muestra 4 secciones y el botón Más", async () => {
	signInAs();
	renderRoute("/");

	const nav = await screen.findByRole("navigation", { name: "Menú principal" });
	for (const seccion of ["Inicio", "Valorizaciones", "Contratos", "Equipos"]) {
		expect(within(nav).getByRole("link", { name: seccion })).toBeInTheDocument();
	}
	expect(within(nav).getByRole("button", { name: "Más" })).toBeInTheDocument();
	for (const seccion of ["Clientes", "Configuración"]) {
		expect(within(nav).queryByRole("link", { name: seccion })).not.toBeInTheDocument();
	}
});

test.each(["Contratos", "Equipos", "Clientes", "Configuración", "Valorizaciones"])(
	"navega a %s desde el menú",
	async (seccion) => {
		const user = userEvent.setup();
		signInAs();
		renderRoute("/");
		await screen.findByRole("heading", { level: 1, name: /Hola,/ });

		await user.click(screen.getAllByRole("link", { name: seccion })[0]);

		expect(await screen.findByRole("heading", { level: 1, name: seccion })).toBeInTheDocument();
	},
);

test("el botón Nueva valorización de la cabecera abre la planilla y se oculta en ella", async () => {
	const user = userEvent.setup();
	signInAs();
	renderRoute("/contratos");

	const header = await screen.findByRole("banner");
	await user.click(within(header).getByRole("link", { name: "Nueva valorización" }));

	expect(
		await screen.findByRole("heading", { level: 1, name: "Nueva valorización" }),
	).toBeInTheDocument();
	expect(
		within(screen.getByRole("banner")).queryByRole("link", { name: "Nueva valorización" }),
	).not.toBeInTheDocument();
});

test("Inicio muestra los indicadores y las valorizaciones recientes", async () => {
	signInAs();
	renderRoute("/");

	const indicadores = await screen.findByRole("region", { name: "Indicadores" });
	for (const indicador of [
		"Valorizado este mes",
		"Contratos activos",
		"Equipos en obra",
		"Clientes activos",
	]) {
		expect(within(indicadores).getByText(indicador)).toBeInTheDocument();
	}
	expect(screen.getByRole("region", { name: "Valorizaciones recientes" })).toBeInTheDocument();
});

test("cerrar sesión vuelve al login", async () => {
	const user = userEvent.setup();
	signInAs();
	renderRoute("/");

	await user.click(await screen.findByRole("button", { name: "Más" }));
	await user.click(await screen.findByRole("button", { name: "Salir" }));

	expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
});

test("el menú del usuario muestra su correo y su rol", async () => {
	const user = userEvent.setup();
	signInAs();
	renderRoute("/");

	await user.click(await screen.findByRole("button", { name: /Ana Quispe/ }));

	const menu = await screen.findByRole("menu");
	expect(within(menu).getByText("ana@hm.pe")).toBeInTheDocument();
	expect(within(menu).getByText("Administrador")).toBeInTheDocument();
	expect(within(menu).getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
});
