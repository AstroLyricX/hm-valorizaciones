import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import {
	clienteService,
	rucService,
} from "../../../src/features/clientes/application/terceroService.instance";
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
	await user.click(await screen.findByRole("button", { name: "Agregar cliente" }));

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
	await clienteService.crear(CLIENTE, "ana@hm.pe");
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
	await clienteService.crear(HUISE, "ana@hm.pe");
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
	await clienteService.crear(HUISE, "ana@hm.pe");
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
	await clienteService.crear(HUISE, "ana@hm.pe");
	await clienteService.crear(
		{ ...CLIENTE, razonSocial: "Minera Ñuñoa", estado: "INACTIVO" },
		"ana@hm.pe",
	);
	renderRoute("/clientes");

	const tabla = await screen.findByRole("table");
	// El buscador de la tabla (el primero; el otro es el de la vista de celular).
	const [filtro] = screen.getAllByRole("searchbox", { name: "Buscar" });
	await user.type(filtro, "nunoa");
	expect(within(tabla).getByText("MINERA ÑUÑOA")).toBeInTheDocument();
	expect(within(tabla).queryByText("HUISE QUEA ANTOLIN")).not.toBeInTheDocument();

	await user.clear(filtro);
	await seleccionar(user, screen.getByRole("combobox", { name: "Filtrar por estado" }), "Activo");
	expect(within(tabla).getByText("HUISE QUEA ANTOLIN")).toBeInTheDocument();
	expect(within(tabla).queryByText("MINERA ÑUÑOA")).not.toBeInTheDocument();
	expect(screen.getByText("1 de 2 registros")).toBeInTheDocument();
});

describe("consulta de RUC", () => {
	const SUNAT = {
		ruc: "20602629903",
		razonSocial: "CONSTRUCTORA ANDINA S.A.C.",
		estado: "ACTIVO",
		condicion: "HABIDO",
		direccion: "JR. BELLAVISTA S/N - OLLACHEA - CARABAYA - PUNO",
	};

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test("al escribir el RUC completa la razón social y la dirección con SUNAT", async () => {
		const user = userEvent.setup();
		jest.spyOn(rucService, "disponible", "get").mockReturnValue(true);
		const consultar = jest
			.spyOn(rucService, "consultar")
			.mockResolvedValue({ tipo: "encontrado", datos: SUNAT, desde: "sunat" });
		renderRoute("/clientes");

		const formulario = await abrirNuevo(user);
		await user.type(within(formulario).getByLabelText(/RUC/), "20602629903");

		expect(
			await within(formulario).findByText("Datos de SUNAT: ACTIVO · HABIDO."),
		).toBeInTheDocument();
		expect(within(formulario).getByLabelText(/Razón social/)).toHaveValue(
			"CONSTRUCTORA ANDINA S.A.C.",
		);
		expect(within(formulario).getAllByLabelText(/^Dirección/)[0]).toHaveValue(SUNAT.direccion);
		expect(consultar).toHaveBeenCalledWith("20602629903");
	});

	test("avisa si el contribuyente no está activo o habido", async () => {
		const user = userEvent.setup();
		jest.spyOn(rucService, "disponible", "get").mockReturnValue(true);
		jest.spyOn(rucService, "consultar").mockResolvedValue({
			tipo: "encontrado",
			datos: { ...SUNAT, estado: "BAJA DE OFICIO", condicion: "NO HABIDO" },
			desde: "sunat",
		});
		renderRoute("/clientes");

		const formulario = await abrirNuevo(user);
		await user.type(within(formulario).getByLabelText(/RUC/), "20602629903");

		expect(
			await within(formulario).findByText("Atención: en SUNAT figura BAJA DE OFICIO · NO HABIDO."),
		).toBeInTheDocument();
	});

	test("si SUNAT no responde, deja completar a mano", async () => {
		const user = userEvent.setup();
		jest.spyOn(rucService, "disponible", "get").mockReturnValue(true);
		jest.spyOn(rucService, "consultar").mockResolvedValue({ tipo: "no-disponible" });
		renderRoute("/clientes");

		const formulario = await abrirNuevo(user);
		await user.type(within(formulario).getByLabelText(/RUC/), "20602629903");

		expect(
			await within(formulario).findByText(
				"No se pudo consultar SUNAT ahora. Completa los datos a mano.",
			),
		).toBeInTheDocument();
		expect(within(formulario).getByLabelText(/Razón social/)).toHaveValue("");
	});

	test("sin Worker configurado no aparece el botón de SUNAT", async () => {
		const user = userEvent.setup();
		renderRoute("/clientes");

		const formulario = await abrirNuevo(user);

		expect(
			within(formulario).queryByRole("button", { name: /Buscar en SUNAT/ }),
		).not.toBeInTheDocument();
	});
});
