import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import {
	clienteService,
	proveedorService,
} from "../../../src/features/clientes/application/terceroService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { seleccionar } from "../../support/campos";
import { CLIENTE, excavadora, HUISE, volquete } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";

let duenoId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	// El dueño de los equipos es un proveedor; el cliente no debe ofrecerse como dueño.
	duenoId = (await proveedorService.crear(HUISE, "ana@hm.pe")).id;
	await clienteService.crear(CLIENTE, "ana@hm.pe");
});

async function abrirNuevo(user: ReturnType<typeof userEvent.setup>) {
	await user.click(await screen.findByRole("button", { name: "Agregar equipo" }));

	return screen.findByRole("dialog", { name: "Nuevo equipo" });
}

async function datosBasicos(user: ReturnType<typeof userEvent.setup>, formulario: HTMLElement) {
	await user.type(within(formulario).getByLabelText(/Descripción del equipo/), "Excavadora");
	await user.type(within(formulario).getByLabelText(/Fabricante/), "Cat");
	await user.type(within(formulario).getByLabelText(/^Modelo/), "340");
	// Pesado (por defecto): no lleva placa.
	await user.type(within(formulario).getByLabelText(/Año/), "2019");
	await user.type(within(formulario).getByLabelText(/Marca del motor/), "Cat");
}

test("registra un equipo propio de H&M, aunque no haya proveedores", async () => {
	const user = userEvent.setup();
	await db.terceros.where("tipo").equals("PROVEEDOR").delete();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	// "H&M (propio)" es la opción por defecto del selector Dueño.
	expect(within(formulario).getByLabelText(/Dueño/)).toHaveTextContent("H&M (propio)");
	// El activo fijo es automático: HM + número para los equipos propios.
	expect(within(formulario).getByLabelText(/Activo fijo/)).toHaveValue("HM001");
	expect(within(formulario).getByLabelText(/Activo fijo/)).toHaveAttribute("readonly");
	await datosBasicos(user, formulario);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Equipo HM001 registrado.")).toBeInTheDocument();
	const filas = within((await screen.findAllByRole("rowgroup"))[1]);
	expect(filas.getByText("H&M (propio)")).toBeInTheDocument();
	expect(filas.getByText("Propio")).toBeInTheDocument();
	expect((await db.equipos.toArray())[0]).toMatchObject({ propiedad: "PROPIO", duenoId: "" });
});

test("filtra los equipos propios y los de proveedores", async () => {
	const user = userEvent.setup();
	await equipoService.crear(excavadora("", { propiedad: "PROPIO" }), "ana@hm.pe");
	await equipoService.crear(volquete(duenoId), "ana@hm.pe");
	renderRoute("/equipos");

	const tabla = await screen.findByRole("table");
	await seleccionar(
		user,
		screen.getByRole("combobox", { name: "Filtrar por propiedad" }),
		"Propios",
	);

	expect(within(tabla).getByText("EXCAVADORA CAT 340")).toBeInTheDocument();
	expect(within(tabla).queryByText("VOLQUETE VOLVO FMX")).not.toBeInTheDocument();
});

test("registra un equipo de un proveedor y lo muestra en la lista", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await datosBasicos(user, formulario);
	await user.click(within(formulario).getByLabelText(/Dueño/));
	// Primero H&M y luego los proveedores; nunca los clientes.
	expect(await screen.findByRole("option", { name: "H&M (propio)" })).toBeInTheDocument();
	// Solo se ofrecen proveedores.
	expect(screen.queryByRole("option", { name: "CONSTRUCTORA ANDINA SAC" })).not.toBeInTheDocument();
	await user.click(await screen.findByRole("option", { name: "HUISE QUEA ANTOLIN" }));
	// Con el código de equipos del proveedor (iniciales de HUISE QUEA ANTOLIN).
	expect(within(formulario).getByLabelText(/Activo fijo/)).toHaveValue("HQA001");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Equipo HQA001 registrado.")).toBeInTheDocument();
	const filas = (await screen.findAllByRole("rowgroup"))[1];
	expect(within(filas).getByText("EXCAVADORA CAT 340")).toBeInTheDocument();
	expect(within(filas).getByText("Por recibir")).toBeInTheDocument();
	expect((await db.equipos.toArray())[0]).toMatchObject({ categoria: "PESADO", placa: "" });
});

test("marca los obligatorios y muestra sus errores a la vez", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await within(formulario).findByText("Ingresa el fabricante.")).toBeInTheDocument();
	expect(within(formulario).getByLabelText(/Serie del equipo/)).not.toBeRequired();
	expect(await db.equipos.count()).toBe(0);
});

test("la placa solo se pide en los equipos livianos", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	expect(within(formulario).queryByLabelText(/Placa/)).not.toBeInTheDocument();

	await seleccionar(user, within(formulario).getByLabelText(/Categoría/), "Liviano");
	expect(within(formulario).getByLabelText(/Placa/)).toBeRequired();
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));
	expect(await within(formulario).findByText("Ingresa la placa.")).toBeInTheDocument();

	// Si vuelve a pesado, lo escrito en la placa no se guarda.
	await user.type(within(formulario).getByLabelText(/Placa/), "abc-123");
	await seleccionar(user, within(formulario).getByLabelText(/Categoría/), "Pesado");
	expect(within(formulario).queryByLabelText(/Placa/)).not.toBeInTheDocument();
	await datosBasicos(user, formulario);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Equipo HM001 registrado.")).toBeInTheDocument();
	expect((await db.equipos.toArray())[0]).toMatchObject({ categoria: "PESADO", placa: "" });
});

test("cambia el estado a falla mecánica y lo refleja en la lista", async () => {
	const user = userEvent.setup();
	await equipoService.crear(excavadora(duenoId), "ana@hm.pe");
	renderRoute("/equipos");

	await user.click(await screen.findByRole("button", { name: "Editar HQA001" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar equipo HQA001" });
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
	await equipoService.crear(volquete(duenoId, { estado: "DV" }), "ana@hm.pe");
	renderRoute("/equipos");

	const tabla = await screen.findByRole("table");
	await seleccionar(
		user,
		screen.getByRole("combobox", { name: "Filtrar por estado" }),
		"Devuelto al dueño",
	);

	expect(within(tabla).getByText("VOLQUETE VOLVO FMX")).toBeInTheDocument();
	expect(within(tabla).queryByText("EXCAVADORA CAT 340")).not.toBeInTheDocument();
	expect(screen.getByText("1 de 2 registros")).toBeInTheDocument();
});

test("el equipo propio usa los estados de obra y el de proveedor los del alquiler", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await user.click(within(formulario).getByLabelText(/^Estado/));
	expect(await screen.findByRole("option", { name: "SB · Stand by" })).toBeInTheDocument();
	expect(screen.queryByRole("option", { name: "EO · En obra" })).not.toBeInTheDocument();
	await user.click(screen.getByRole("option", { name: "P · Proyectado" }));

	// Al elegir un proveedor como dueño, el estado pasa a "Por recibir" y cambia la lista.
	await seleccionar(user, within(formulario).getByLabelText(/Dueño/), "HUISE QUEA ANTOLIN");
	expect(within(formulario).getByLabelText(/^Estado/)).toHaveTextContent("PR · Por recibir");
	await user.click(within(formulario).getByLabelText(/^Estado/));
	const opciones = await screen.findAllByRole("option");
	expect(opciones.map((opcion) => opcion.textContent)).toEqual([
		"PR · Por recibir",
		"EO · En obra",
		"FM · Falla mecánica",
		"DV · Devuelto al dueño",
	]);
	expect(screen.queryByRole("option", { name: "SB · Stand by" })).not.toBeInTheDocument();
});

test("un clic fuera del formulario no lo cierra ni pierde lo escrito", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	await user.type(within(formulario).getByLabelText(/^Modelo/), "340");
	await user.click(document.body);

	expect(screen.getByRole("dialog", { name: "Nuevo equipo" })).toBeInTheDocument();
	expect(within(formulario).getByLabelText(/^Modelo/)).toHaveValue("340");
});

test("el activo fijo sigue la numeración de cada dueño", async () => {
	const user = userEvent.setup();
	await equipoService.crear(excavadora(duenoId), "ana@hm.pe");
	await equipoService.crear(volquete("", { propiedad: "PROPIO" }), "ana@hm.pe");
	renderRoute("/equipos");

	const formulario = await abrirNuevo(user);
	const activoFijo = within(formulario).getByLabelText(/Activo fijo/);
	expect(activoFijo).toHaveValue("HM002");
	await seleccionar(user, within(formulario).getByLabelText(/Dueño/), "HUISE QUEA ANTOLIN");

	expect(activoFijo).toHaveValue("HQA002");
});
