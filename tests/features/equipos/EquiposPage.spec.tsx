import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { terceroService } from "../../../src/features/clientes/application/terceroService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { seleccionar } from "../../support/campos";
import { CLIENTE, excavadora, volquete } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";

let duenoId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	duenoId = (await terceroService.crear(CLIENTE, "ana@hm.pe")).id;
});

async function abrirNuevo(user: ReturnType<typeof userEvent.setup>) {
	await user.click(within(await screen.findByRole("table")).getByRole("button", { name: "Nuevo" }));

	return screen.findByRole("dialog", { name: "Nuevo equipo" });
}

test("sin clientes pide registrar uno primero", async () => {
	await db.terceros.clear();
	renderRoute("/equipos");

	expect(await screen.findByText("Primero registra un cliente")).toBeInTheDocument();
});

test("registra un equipo con su dueño y lo muestra en la lista", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await user.type(within(formulario).getByLabelText(/Activo fijo/), "af-001");
	await user.type(within(formulario).getByLabelText(/Descripción del equipo/), "Excavadora");
	await user.type(within(formulario).getByLabelText(/Fabricante/), "Cat");
	await user.type(within(formulario).getByLabelText(/^Modelo/), "340");
	await user.type(within(formulario).getByLabelText(/Placa/), "exc-340");
	await user.type(within(formulario).getByLabelText(/Año/), "2019");
	await user.type(within(formulario).getByLabelText(/Marca del motor/), "Cat");
	await seleccionar(user, within(formulario).getByLabelText(/Dueño/), "CONSTRUCTORA ANDINA SAC");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Equipo AF-001 registrado.")).toBeInTheDocument();
	const filas = (await screen.findAllByRole("rowgroup"))[1];
	expect(within(filas).getByText("EXCAVADORA CAT 340")).toBeInTheDocument();
	expect(within(filas).getByText("EXC-340")).toBeInTheDocument();
	expect(within(filas).getByText("Proyectado")).toBeInTheDocument();
});

test("marca los obligatorios y muestra sus errores a la vez", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(
		await within(formulario).findByText("Ingresa el código de activo fijo."),
	).toBeInTheDocument();
	expect(within(formulario).getByText("Ingresa la placa.")).toBeInTheDocument();
	expect(within(formulario).getByText("Selecciona el dueño del equipo.")).toBeInTheDocument();
	expect(within(formulario).getByLabelText(/Placa/)).toBeRequired();
	expect(within(formulario).getByLabelText(/Serie del equipo/)).not.toBeRequired();
	expect(await db.equipos.count()).toBe(0);
});

test("cambia el estado a falla mecánica y lo refleja en la lista", async () => {
	const user = userEvent.setup();
	await equipoService.crear(excavadora(duenoId), "ana@hm.pe");
	renderRoute("/equipos");

	await user.click(await screen.findByRole("button", { name: "Editar AF-001" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar equipo AF-001" });
	await seleccionar(user, within(formulario).getByLabelText(/^Estado/), /Falla mecánica/);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(
		await within((await screen.findAllByRole("rowgroup"))[1]).findByText("Falla mecánica"),
	).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.equipos.toArray())[0]?.estado).toBe("FM");
	});
});

test("filtra los equipos por estado", async () => {
	const user = userEvent.setup();
	await equipoService.crear(excavadora(duenoId), "ana@hm.pe");
	await equipoService.crear(volquete(duenoId, { estado: "D" }), "ana@hm.pe");
	renderRoute("/equipos");

	const tabla = await screen.findByRole("table");
	await seleccionar(
		user,
		within(tabla).getByRole("combobox", { name: "Filtrar por estado" }),
		"Desmovilizado",
	);

	expect(within(tabla).getByText("VOLQUETE VOLVO FMX")).toBeInTheDocument();
	expect(within(tabla).queryByText("EXCAVADORA CAT 340")).not.toBeInTheDocument();
	expect(screen.getByText("1 de 2 registros")).toBeInTheDocument();
});
