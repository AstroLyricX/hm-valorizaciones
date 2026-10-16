import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import {
	clienteService,
	proveedorService,
} from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { elegirFecha, seleccionar } from "../../support/campos";
import { HUISE } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { CLIENTE, contratoDatos, equipoDelContrato, excavadora, volquete } from "./fixtures";

type Usuario = ReturnType<typeof userEvent.setup>;

let clienteId: string;
let excavadoraId: string;
let volqueteId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	excavadoraId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	volqueteId = (await equipoService.crear(volquete(clienteId), "ana@hm.pe")).id;
});

async function abrirNuevo(user: Usuario) {
	await user.click(await screen.findByRole("button", { name: "Nuevo contrato" }));

	return screen.findByRole("dialog", { name: "Nuevo contrato" });
}

async function llenarEquipo(
	user: Usuario,
	numero: number,
	equipo: RegExp,
	horas: string,
	costo: string,
) {
	await seleccionar(
		user,
		screen.getByRole("combobox", { name: `Equipo del ítem ${numero}` }),
		equipo,
	);
	await user.type(screen.getByLabelText(`Horas mínimas del ítem ${numero}`), horas);
	await user.type(screen.getByLabelText(`Costo por hora del ítem ${numero}`), costo);
}

test("sin equipos avisa que primero hay que registrarlos", async () => {
	await db.equipos.clear();
	const user = userEvent.setup();
	renderRoute("/contratos");

	await user.click(await screen.findByRole("button", { name: "Nuevo contrato" }));

	expect(
		await screen.findByText("Primero registra al menos un cliente o proveedor y un equipo."),
	).toBeInTheDocument();
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("registra un contrato con 2 equipos y abre su ficha con el monto total", async () => {
	const user = userEvent.setup();
	renderRoute("/contratos");

	const formulario = await abrirNuevo(user);
	await seleccionar(user, within(formulario).getByLabelText(/Cliente/), "CONSTRUCTORA ANDINA SAC");
	await user.type(within(formulario).getByLabelText(/Proyecto/), "OSUR");
	await user.type(within(formulario).getByLabelText(/Ubicación/), "Asillo");
	await elegirFecha(user, within(formulario).getByLabelText(/Fecha de inicio/), "2026-08-01");
	await elegirFecha(user, within(formulario).getByLabelText(/Fecha de fin/), "2026-12-31");
	expect(within(formulario).getByLabelText(/Fecha de inicio/)).toHaveTextContent("01/08/2026");

	await user.click(within(formulario).getByRole("button", { name: "Agregar equipo" }));
	await llenarEquipo(user, 1, /EXCAVADORA CAT 340/, "150", "47");
	await user.click(within(formulario).getByRole("button", { name: "Agregar equipo" }));
	await llenarEquipo(user, 2, /VOLQUETE VOLVO FMX/, "20", "850,00");

	// Soles por defecto: el costo por hora y los totales salen en S/.
	expect(within(formulario).getByText("Costo por hora (S/)", { exact: false })).toBeInTheDocument();
	expect(screen.getByLabelText("Parcial del equipo 1")).toHaveTextContent("S/ 7,050.00");
	expect(screen.getByLabelText("Monto contractual")).toHaveTextContent("S/ 24,050.00");

	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Contrato CTR-001 registrado.")).toBeInTheDocument();
	expect(await screen.findByRole("heading", { level: 1, name: "OSUR" })).toBeInTheDocument();
	const resumen = screen.getByRole("region", { name: "Resumen del contrato" });
	expect(within(resumen).getAllByText("S/ 24,050.00")).toHaveLength(2);
	expect(screen.getByRole("region", { name: "Equipos del contrato" })).toHaveTextContent(
		"VOLQUETE VOLVO FMX",
	);
});

test("muestra todos los errores obligatorios a la vez", async () => {
	const user = userEvent.setup();
	renderRoute("/contratos");

	const formulario = await abrirNuevo(user);
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(
		await within(formulario).findByText("Selecciona el cliente o proveedor."),
	).toBeInTheDocument();
	expect(within(formulario).getByText("Ingresa el proyecto.")).toBeInTheDocument();
	expect(within(formulario).getByText("Selecciona la fecha de fin.")).toBeInTheDocument();
	expect(within(formulario).getByText("Agrega al menos un equipo.")).toBeInTheDocument();
	expect(await db.contratos.count()).toBe(0);
});

test("al editar, quitar un equipo actualiza el monto contractual", async () => {
	const user = userEvent.setup();
	const { contrato } = await contratoService.crear(
		contratoDatos(clienteId, excavadoraId, {
			equipos: [
				equipoDelContrato(excavadoraId),
				equipoDelContrato(volqueteId, { horasMinimas: "20", costoHora: 85000 }),
			],
		}),
		"ana@hm.pe",
	);
	renderRoute(`/contratos/${contrato.id}`);

	await user.click(await screen.findByRole("button", { name: "Editar" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar contrato CTR-001" });
	expect(within(formulario).getByLabelText("Monto contractual")).toHaveTextContent("USD 24,050.00");
	await user.click(within(formulario).getByRole("button", { name: "Quitar equipo 2" }));
	expect(within(formulario).getByLabelText("Monto contractual")).toHaveTextContent("USD 7,050.00");
	await user.click(within(formulario).getByRole("button", { name: "Guardar" }));

	expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.contratos.get(contrato.id))?.montoContractual).toBe(705000);
	});
});

test("el listado muestra el contrato con su cliente, monto y estado, y abre la ficha", async () => {
	const user = userEvent.setup();
	await contratoService.crear(contratoDatos(clienteId, excavadoraId), "ana@hm.pe");
	await contratoService.crear(
		contratoDatos(clienteId, volqueteId, {
			proyecto: "Antiguo",
			fechaInicio: "2020-01-01",
			fechaFin: "2020-12-31",
		}),
		"ana@hm.pe",
	);
	renderRoute("/contratos");

	const tabla = await screen.findByRole("table");
	expect(within(tabla).getAllByText("CONSTRUCTORA ANDINA SAC")).toHaveLength(2);
	expect(within(tabla).getAllByText("USD 7,050.00")).toHaveLength(2);
	expect(within(screen.getAllByRole("rowgroup")[1]).getByText("Vencido")).toBeInTheDocument();

	await seleccionar(user, screen.getByRole("combobox", { name: "Filtrar por estado" }), "Vencido");
	expect(
		within(tabla).queryByText("GESTIÓN GENERAL DE SUBCONTRATOS - OSUR"),
	).not.toBeInTheDocument();
	await seleccionar(
		user,
		screen.getByRole("combobox", { name: "Filtrar por estado" }),
		"Estado: todos",
	);

	await user.click(within(tabla).getByRole("button", { name: "Ver CTR-001" }));
	expect(
		await screen.findByRole("heading", {
			level: 1,
			name: "GESTIÓN GENERAL DE SUBCONTRATOS - OSUR",
		}),
	).toBeInTheDocument();
});

test("un contrato recibido pide un proveedor y solo ofrece sus equipos", async () => {
	const user = userEvent.setup();
	const proveedorId = (await proveedorService.crear(HUISE, "ana@hm.pe")).id;
	await equipoService.crear(
		excavadora(proveedorId, {
			activoFijo: "AF-009",
			placa: "HUI-009",
			descripcion: "Retroexcavadora",
		}),
		"ana@hm.pe",
	);
	// Un equipo propio de H&M: nunca entra en un contrato recibido.
	await equipoService.crear(
		excavadora("", {
			activoFijo: "AF-100",
			placa: "HM-100",
			descripcion: "Motoniveladora",
			propiedad: "PROPIO",
		}),
		"ana@hm.pe",
	);
	renderRoute("/contratos");

	await user.click(await screen.findByRole("button", { name: "Nuevo contrato" }));
	const formulario = await screen.findByRole("dialog", { name: "Nuevo contrato" });
	await seleccionar(user, within(formulario).getByLabelText(/Tipo de contrato/), /Recibido/);

	expect(
		within(formulario).getByText("H&M recibe las valorizaciones del proveedor y paga."),
	).toBeInTheDocument();
	await user.click(within(formulario).getByLabelText(/^Proveedor/));
	expect(screen.queryByRole("option", { name: "CONSTRUCTORA ANDINA SAC" })).not.toBeInTheDocument();
	await user.click(await screen.findByRole("option", { name: "HUISE QUEA ANTOLIN" }));

	await user.click(within(formulario).getByRole("button", { name: "Agregar equipo" }));
	await user.click(screen.getByRole("combobox", { name: "Equipo del ítem 1" }));
	expect(await screen.findByRole("option", { name: /RETROEXCAVADORA/ })).toBeInTheDocument();
	expect(screen.queryByRole("option", { name: /VOLQUETE/ })).not.toBeInTheDocument();
	expect(screen.queryByRole("option", { name: /MOTONIVELADORA/ })).not.toBeInTheDocument();
});

test("un contrato se puede pactar en dólares", async () => {
	const user = userEvent.setup();
	renderRoute("/contratos");

	await user.click(await screen.findByRole("button", { name: "Nuevo contrato" }));
	const formulario = await screen.findByRole("dialog", { name: "Nuevo contrato" });
	expect(within(formulario).getByLabelText(/Moneda/)).toHaveTextContent("Soles (S/)");
	await seleccionar(user, within(formulario).getByLabelText(/Moneda/), "Dólares (USD)");
	await user.click(within(formulario).getByRole("button", { name: "Agregar equipo" }));

	expect(
		within(formulario).getByText("Costo por hora (USD)", { exact: false }),
	).toBeInTheDocument();
	expect(within(formulario).getByLabelText("Monto contractual")).toHaveTextContent("USD 0.00");
});
