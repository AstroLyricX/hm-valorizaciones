import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { terceroService } from "../../../src/features/clientes/application/terceroService.instance";
import { renderRoute, signInAs } from "../../support/renderRoute";

const HUISE = {
	tipo: "PROVEEDOR" as const,
	razonSocial: "Huise Quea Antolin",
	ruc: "10098637074",
	direccion: "",
	contacto: "",
	telefono: "",
	correo: "",
};

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

async function llenarFormulario(
	user: ReturnType<typeof userEvent.setup>,
	razonSocial: string,
	ruc: string,
) {
	const formulario = await screen.findByRole("dialog");
	await user.type(within(formulario).getByLabelText("Razón social o nombre"), razonSocial);
	await user.type(within(formulario).getByLabelText("RUC"), ruc);

	return formulario;
}

test("sin registros muestra el estado vacío", async () => {
	renderRoute("/clientes");

	expect(await screen.findByText("No hay clientes registrados")).toBeInTheDocument();
});

test("registra un cliente y lo muestra en la lista con su código", async () => {
	const user = userEvent.setup();
	renderRoute("/clientes");

	await user.click(await screen.findByRole("button", { name: "Agregar cliente" }));
	const formulario = await llenarFormulario(user, "Constructora Andina", "20602629903");
	await user.click(within(formulario).getByRole("button", { name: "Registrar" }));

	expect(await screen.findByText("Cliente CLI-001 registrado.")).toBeInTheDocument();
	const tabla = await screen.findByRole("table");
	expect(within(tabla).getByText("CONSTRUCTORA ANDINA")).toBeInTheDocument();
	expect(within(tabla).getByText("CLI-001")).toBeInTheDocument();
});

test("avisa en el campo RUC si ya está registrado", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	await user.click(await screen.findByRole("button", { name: "Agregar cliente" }));
	const formulario = await llenarFormulario(user, "Otro nombre", "10098637074");
	await user.click(within(formulario).getByRole("button", { name: "Registrar" }));

	expect(
		await within(formulario).findByText("Este RUC ya está registrado como CLI-001."),
	).toBeInTheDocument();
	expect(await db.terceros.count()).toBe(1);
});

test("edita un registro desde el menú de acciones", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	await user.click(within(tabla).getByRole("button", { name: "Acciones de HUISE QUEA ANTOLIN" }));
	await user.click(await screen.findByRole("menuitem", { name: "Editar" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar CLI-001" });
	await user.type(within(formulario).getByLabelText("Contacto"), "Antolín");
	await user.click(within(formulario).getByRole("button", { name: "Guardar cambios" }));

	expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.terceros.toArray())[0]?.contacto).toBe("Antolín");
	});
});

test("desactivar pide confirmación y lo oculta de los activos", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	await user.click(within(tabla).getByRole("button", { name: "Acciones de HUISE QUEA ANTOLIN" }));
	await user.click(await screen.findByRole("menuitem", { name: "Desactivar" }));
	const confirmacion = await screen.findByRole("alertdialog");
	await user.click(within(confirmacion).getByRole("button", { name: "Desactivar" }));

	expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
	expect((await db.terceros.toArray())[0]?.estado).toBe("INACTIVO");
});

test("busca por razón social o RUC sin importar tildes ni mayúsculas", async () => {
	const user = userEvent.setup();
	await terceroService.crear(HUISE, "ana@hm.pe");
	await terceroService.crear(
		{ ...HUISE, tipo: "CLIENTE", razonSocial: "Minera Ñuñoa", ruc: "20602629903" },
		"ana@hm.pe",
	);
	renderRoute("/clientes");

	const busqueda = await screen.findByRole("searchbox", { name: "Buscar" });
	await user.type(busqueda, "nunoa");
	const tabla = screen.getByRole("table");
	expect(within(tabla).getByText("MINERA ÑUÑOA")).toBeInTheDocument();
	expect(within(tabla).queryByText("HUISE QUEA ANTOLIN")).not.toBeInTheDocument();

	await user.clear(busqueda);
	await user.type(busqueda, "100986");
	expect(within(screen.getByRole("table")).getByText("HUISE QUEA ANTOLIN")).toBeInTheDocument();
});
