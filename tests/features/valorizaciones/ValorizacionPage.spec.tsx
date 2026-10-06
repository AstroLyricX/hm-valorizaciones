import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { terceroService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import {
	valorizacionRepository,
	valorizacionService,
} from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { seleccionar } from "../../support/campos";
import { CLIENTE, excavadora } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { contratoDatos } from "../contratos/fixtures";

let contratoId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	const clienteId = (await terceroService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	contratoId = (await contratoService.crear(contratoDatos(clienteId, equipoId), "ana@hm.pe"))
		.contrato.id;
});

// Julio emitido con 114.40 h, como el acumulado anterior de la hoja VALORIZACION del xlsm.
async function julioEmitido() {
	const julio = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-07" },
		"ana@hm.pe",
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(julio.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		julio.id,
		fila.contratoEquipo.id,
		"114.4",
		"ana@hm.pe",
	);
	await valorizacionRepository.guardar({ ...julio, estado: "EMITIDA", numero: "0001-2026" });
}

test("crea el borrador eligiendo contrato y periodo, y abre la planilla", async () => {
	const user = userEvent.setup();
	renderRoute("/valorizaciones/nueva");

	await seleccionar(user, await screen.findByLabelText(/Contrato/), /CTR-001/);
	await seleccionar(user, screen.getByLabelText(/Periodo/), "Agosto");
	await seleccionar(user, screen.getByLabelText("Año del periodo"), "2026");
	await user.click(screen.getByRole("button", { name: "Continuar con la planilla" }));

	expect(
		await screen.findByRole("heading", { level: 1, name: "Valorización · Agosto 2026" }),
	).toBeInTheDocument();
	expect(screen.getByLabelText(/Nombre del servicio/)).toHaveValue("ALQUILER DE EQUIPO PESADO");
	expect(await db.valorizaciones.count()).toBe(1);
});

test("pide el contrato antes de continuar", async () => {
	const user = userEvent.setup();
	renderRoute("/valorizaciones/nueva");

	await user.click(await screen.findByRole("button", { name: "Continuar con la planilla" }));

	expect(await screen.findByText("Selecciona el contrato.")).toBeInTheDocument();
	expect(await db.valorizaciones.count()).toBe(0);
});

test("calcula la planilla del xlsm al escribir las horas, avisa el exceso y lo guarda solo", async () => {
	const user = userEvent.setup();
	await julioEmitido();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "53,23");

	const planilla = screen.getByRole("region", { name: "Planilla de medición" });
	expect(within(planilla).getAllByText("USD 2,501.81").length).toBeGreaterThan(0);
	expect(within(planilla).getAllByText("USD 2,952.14").length).toBeGreaterThan(0);
	expect(screen.getByRole("alert")).toHaveTextContent("167.63 h de 150.00 h");
	const resumen = screen.getByRole("region", { name: "Resumen de la valorización" });
	expect(resumen).toHaveTextContent("USD -828.61");
	expect(resumen).toHaveTextContent("111.75 %");

	await waitFor(async () => {
		const items = await valorizacionRepository.items(agosto.id);
		expect(items[0]?.cantidadActual).toBe("53.23");
	});
	expect(await screen.findByText("Guardado en este equipo")).toBeInTheDocument();
});

test("marca las horas inválidas y no las guarda", async () => {
	const user = userEvent.setup();
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
	);
	renderRoute(`/valorizaciones/${borrador.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "abc");

	expect(screen.getAllByText("Ingresa las horas, por ejemplo 53.23.").length).toBeGreaterThan(0);
	expect(horas).toHaveAttribute("aria-invalid", "true");
	expect((await valorizacionRepository.items(borrador.id))[0]?.cantidadActual).toBe("0");
});

test("el listado muestra el borrador y lo descarta desde la planilla", async () => {
	const user = userEvent.setup();
	await valorizacionService.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");
	renderRoute("/valorizaciones");

	const tabla = await screen.findByRole("table");
	expect(within(tabla).getByText("Agosto 2026")).toBeInTheDocument();
	expect(within(screen.getAllByRole("rowgroup")[1]).getByText("Borrador")).toBeInTheDocument();
	await user.click(within(tabla).getByRole("button", { name: "Continuar Agosto 2026 de CTR-001" }));

	await user.click(await screen.findByRole("button", { name: "Descartar borrador" }));
	await user.click(
		within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar" }),
	);

	expect(await screen.findByText("Borrador descartado.")).toBeInTheDocument();
	expect(await screen.findByText("No hay valorizaciones")).toBeInTheDocument();
});
