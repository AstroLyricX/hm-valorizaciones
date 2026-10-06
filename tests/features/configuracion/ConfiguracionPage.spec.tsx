import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { renderRoute, signInAs } from "../../support/renderRoute";

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

async function abrirConfiguracion() {
	renderRoute("/configuracion");

	return screen.findByLabelText(/Razón social/);
}

test("muestra los datos iniciales de la empresa", async () => {
	expect(await abrirConfiguracion()).toHaveValue(
		"MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L.",
	);
	expect(screen.getByLabelText(/RUC/)).toHaveValue("20602629903");
	expect(screen.getByLabelText(/IGV/)).toHaveValue("18");
	expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
});

test("muestra un error si el RUC no es válido y no guarda", async () => {
	const user = userEvent.setup();
	await abrirConfiguracion();

	const ruc = screen.getByLabelText(/RUC/);
	await user.clear(ruc);
	await user.type(ruc, "20123456789");
	await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

	expect(await screen.findByText("El RUC no es válido. Revisa los dígitos.")).toBeInTheDocument();
	expect(ruc).toHaveAttribute("aria-invalid", "true");
	expect((await db.empresa.get("empresa"))?.ruc).toBe("20602629903");
});

test("guarda los cambios y los conserva", async () => {
	const user = userEvent.setup();
	await abrirConfiguracion();

	const igv = screen.getByLabelText(/IGV/);
	await user.clear(igv);
	await user.type(igv, "10,5");
	await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

	expect(await screen.findByText("Datos de la empresa guardados.")).toBeInTheDocument();
	await waitFor(async () => {
		expect((await db.empresa.get("empresa"))?.igvPorcentaje).toBe(10.5);
	});
	expect((await db.empresa.get("empresa"))?.updatedBy).toBe("ana@hm.pe");
});

test("descartar vuelve a los valores guardados", async () => {
	const user = userEvent.setup();
	await abrirConfiguracion();

	const telefono = screen.getByLabelText("Teléfono");
	await user.clear(telefono);
	await user.type(telefono, "999");
	await user.click(screen.getByRole("button", { name: "Descartar" }));

	expect(telefono).toHaveValue("963313151");
});
