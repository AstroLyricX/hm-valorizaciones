import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import {
	clienteService,
	proveedorService,
} from "../../../src/features/clientes/application/terceroService.instance";
import { CLIENTE, HUISE } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

test("registra un proveedor con su código PRO y no lo mezcla con los clientes", async () => {
	const user = userEvent.setup();
	await clienteService.crear(CLIENTE, "ana@hm.pe");
	renderRoute("/proveedores");

	expect(await screen.findByRole("heading", { level: 1, name: "Proveedores" })).toBeInTheDocument();
	await user.click(within(await screen.findByRole("table")).getByRole("button", { name: "Nuevo" }));
	const formulario = await screen.findByRole("dialog", { name: "Nuevo proveedor" });
	await user.type(within(formulario).getByLabelText(/Razón social/), "Huise Quea Antolin");
	await user.type(within(formulario).getByLabelText(/RUC/), "10098637074");
	await user.type(within(formulario).getByLabelText(/Correo/), "huise@correo.pe");
	await user.type(within(formulario).getAllByLabelText(/^Dirección/)[0], "Jr. Bellavista S/N");
	await user.type(within(formulario).getByLabelText(/Nombre completo/), "Antolin Huise Quea");
	await user.type(within(formulario).getByLabelText(/DNI/), "02345678");
	await user.type(within(formulario).getByLabelText(/Teléfono/), "931161371");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Proveedor PRO-001 registrado.")).toBeInTheDocument();
	const filas = within((await screen.findAllByRole("rowgroup"))[1]);
	expect(filas.getByText("HUISE QUEA ANTOLIN")).toBeInTheDocument();
	expect(filas.queryByText("CONSTRUCTORA ANDINA SAC")).not.toBeInTheDocument();
});

test("la lista de clientes no muestra a los proveedores", async () => {
	await proveedorService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	expect(await screen.findByText("No hay clientes registrados")).toBeInTheDocument();
});

test("el menú tiene Clientes y Proveedores", async () => {
	renderRoute("/");

	await screen.findByRole("heading", { level: 1, name: /Hola,/ });
	expect(screen.getAllByRole("link", { name: "Proveedores" }).length).toBeGreaterThan(0);
	expect(screen.getAllByRole("link", { name: "Clientes" }).length).toBeGreaterThan(0);
});
