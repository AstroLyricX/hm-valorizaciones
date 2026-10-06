import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { terceroService } from "../../../src/features/clientes/application/terceroService.instance";
import { seleccionar } from "../../support/campos";
import { CLIENTE, HUISE } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";

type Usuario = ReturnType<typeof userEvent.setup>;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

async function abrirNuevo(user: Usuario) {
	await user.click(within(await screen.findByRole("table")).getByRole("button", { name: "Nuevo" }));

	return screen.findByRole("dialog", { name: "Nuevo cliente" });
}

async function llenarObligatorios(user: Usuario, formulario: HTMLElement, ruc: string) {
	await user.type(within(formulario).getByLabelText(/Razón social/), "Constructora Andina");
	await user.type(within(formulario).getByLabelText(/RUC/), ruc);
	await user.type(within(formulario).getByLabelText(/Correo/), "obras@andina.pe");
	await user.type(within(formulario).getAllByLabelText(/^Dirección/)[0], "Jr. Bellavista S/N");
	await user.type(within(formulario).getByLabelText(/Nombre completo/), "Juan Pérez");
	await user.type(within(formulario).getByLabelText(/DNI/), "40123456");
	await user.type(within(formulario).getByLabelText(/Teléfono/), "951234567");
}

test("sin registros muestra el estado vacío", async () => {
	renderRoute("/clientes");

	expect(await screen.findByText("No hay clientes registrados")).toBeInTheDocument();
});

test("registra un cliente con su representante y lo muestra con su código", async () => {
	const user = userEvent.setup();
	renderRoute("/clientes");

	const formulario = await abrirNuevo(user);
	await llenarObligatorios(user, formulario, "20602629903");
	await seleccionar(user, within(formulario).getByLabelText(/Banco/), "BCP");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Cliente CLI-001 registrado.")).toBeInTheDocument();
	const filas = (await screen.findAllByRole("rowgroup"))[1];
	expect(within(filas).getByText("CONSTRUCTORA ANDINA")).toBeInTheDocument();
	expect(within(filas).getByText("JUAN PÉREZ")).toBeInTheDocument();
	expect((await db.terceros.toArray())[0]).toMatchObject({ codigo: "CLI-001", banco: "BCP" });
});

test("marca los obligatorios con * y muestra sus errores a la vez", async () => {
	const user = userEvent.setup();
	renderRoute("/clientes");

	const formulario = await abrirNuevo(user);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await within(formulario).findByText("Ingresa la razón social.")).toBeInTheDocument();
	expect(within(formulario).getByText("El RUC debe tener 11 dígitos.")).toBeInTheDocument();
	expect(within(formulario).getByText("El DNI debe tener 8 dígitos.")).toBeInTheDocument();
	expect(within(formulario).getByLabelText(/RUC/)).toBeRequired();
	expect(within(formulario).getByLabelText(/CCI/)).not.toBeRequired();
	expect(await db.terceros.count()).toBe(0);
});

test("avisa en el campo RUC si ya está registrado", async () => {
	const user = userEvent.setup();
	await terceroService.crear(CLIENTE, "ana@hm.pe");
	renderRoute("/clientes");

	const formulario = await abrirNuevo(user);
	await llenarObligatorios(user, formulario, "20602629903");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(
		await within(formulario).findByText("Este RUC ya está registrado como CLI-001."),
	).toBeInTheDocument();
	expect(await db.terceros.count()).toBe(1);
});

test("edita un registro con el botón de editar de la fila", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	await user.click(within(tabla).getByRole("button", { name: "Editar HUISE QUEA ANTOLIN" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar cliente CLI-001" });
	await seleccionar(user, within(formulario).getByLabelText(/Estado civil/), "Casado(a)");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.terceros.toArray())[0]?.representanteEstadoCivil).toBe("CASADO");
	});
});

test("desactivar pide confirmación y cambia el estado a inactivo", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	await user.click(within(tabla).getByRole("button", { name: "Desactivar HUISE QUEA ANTOLIN" }));
	const confirmacion = await screen.findByRole("alertdialog");
	await user.click(within(confirmacion).getByRole("button", { name: "Desactivar" }));

	expect(
		await within(tabla).findByRole("button", { name: "Activar HUISE QUEA ANTOLIN" }),
	).toBeInTheDocument();
	// Las filas están en el segundo grupo (el primero es la cabecera con los filtros).
	expect(within(screen.getAllByRole("rowgroup")[1]).getByText("Inactivo")).toBeInTheDocument();
	expect((await db.terceros.toArray())[0]?.estado).toBe("INACTIVO");
});

test("filtra por columna sin importar tildes ni mayúsculas", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	await terceroService.crear(
		{ ...CLIENTE, razonSocial: "Minera Ñuñoa", estado: "INACTIVO" },
		"ana@hm.pe",
	);
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	const filtro = within(tabla).getByRole("searchbox", { name: "Filtrar por razón social" });
	await user.type(filtro, "nunoa");
	expect(within(tabla).getByText("MINERA ÑUÑOA")).toBeInTheDocument();
	expect(within(tabla).queryByText("HUISE QUEA ANTOLIN")).not.toBeInTheDocument();

	await user.clear(filtro);
	await seleccionar(
		user,
		within(tabla).getByRole("combobox", { name: "Filtrar por estado" }),
		"Activo",
	);
	expect(within(tabla).getByText("HUISE QUEA ANTOLIN")).toBeInTheDocument();
	expect(within(tabla).queryByText("MINERA ÑUÑOA")).not.toBeInTheDocument();
	expect(screen.getByText("1 de 2 registros")).toBeInTheDocument();
});
