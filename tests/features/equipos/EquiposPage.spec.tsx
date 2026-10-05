import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { renderRoute, signInAs } from "../../support/renderRoute";

const EXCAVADORA = {
	tipo: "Excavadora",
	marca: "CAT",
	modelo: "340",
	serie: "",
	placa: "",
	anio: "2019",
	propietario: "",
	horometro: "1250.5",
	estado: "OPERATIVO" as const,
	ubicacion: "Asillo",
	observaciones: "",
};

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

test("sin equipos muestra el estado vacío", async () => {
	renderRoute("/equipos");

	expect(await screen.findByText("No hay equipos registrados")).toBeInTheDocument();
});

test("registra un equipo y lo muestra con su código y horómetro", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	await user.click(await screen.findByRole("button", { name: "Agregar equipo" }));
	const formulario = await screen.findByRole("dialog");
	await user.type(within(formulario).getByLabelText("Tipo de equipo"), "Excavadora");
	await user.type(within(formulario).getByLabelText("Marca"), "Cat");
	await user.type(within(formulario).getByLabelText("Modelo"), "340");
	await user.type(within(formulario).getByLabelText("Horómetro"), "1250,5");
	await user.click(within(formulario).getByRole("button", { name: "Registrar" }));

	expect(await screen.findByText("Equipo EQ-001 registrado.")).toBeInTheDocument();
	const tabla = await screen.findByRole("table");
	expect(within(tabla).getByText("EXCAVADORA CAT 340")).toBeInTheDocument();
	expect(within(tabla).getByText("1,250.5 h")).toBeInTheDocument();
});

test("exige tipo, marca y modelo", async () => {
	const user = userEvent.setup();
	renderRoute("/equipos");

	await user.click(await screen.findByRole("button", { name: "Agregar equipo" }));
	const formulario = await screen.findByRole("dialog");
	await user.click(within(formulario).getByRole("button", { name: "Registrar" }));

	expect(
		await within(formulario).findByText("Ingresa el tipo de equipo, por ejemplo Excavadora."),
	).toBeInTheDocument();
	expect(within(formulario).getByText("Ingresa la marca.")).toBeInTheDocument();
	expect(within(formulario).getByText("Ingresa el modelo.")).toBeInTheDocument();
});

test("cambia el estado a mantenimiento y lo refleja en la lista", async () => {
	const user = userEvent.setup();
	await equipoService.crear(EXCAVADORA, "ana@hm.pe");
	renderRoute("/equipos");

	await user.click(await screen.findByRole("button", { name: "Editar EXCAVADORA CAT 340" }));
	const formulario = await screen.findByRole("dialog", { name: "Editar EQ-001" });
	await user.selectOptions(within(formulario).getByLabelText("Estado"), "EN_MANTENIMIENTO");
	await user.click(within(formulario).getByRole("button", { name: "Guardar cambios" }));

	expect(
		await within(await screen.findByRole("table")).findByText("En mantenimiento"),
	).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.equipos.toArray())[0]?.estado).toBe("EN_MANTENIMIENTO");
	});
});

test("oculta los equipos dados de baja por defecto", async () => {
	await equipoService.crear(EXCAVADORA, "ana@hm.pe");
	await equipoService.crear({ ...EXCAVADORA, tipo: "Volquete", estado: "BAJA" }, "ana@hm.pe");
	renderRoute("/equipos");

	const tabla = await screen.findByRole("table");
	expect(within(tabla).getByText("EXCAVADORA CAT 340")).toBeInTheDocument();
	expect(within(tabla).queryByText("VOLQUETE CAT 340")).not.toBeInTheDocument();
	expect(screen.getByText("1 de 2 registros")).toBeInTheDocument();
});
