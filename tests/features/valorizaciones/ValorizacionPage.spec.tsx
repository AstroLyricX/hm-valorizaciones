import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import {
	valorizacionRepository,
	valorizacionService,
} from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { seleccionar } from "../../support/campos";
import { CLIENTE, excavadora, HOY } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { contratoDatos } from "../contratos/fixtures";

// La generación real del PDF se prueba en Cypress; aquí basta con un archivo de ejemplo.
jest.mock("../../../src/features/valorizaciones/pdf/generarPdf", () => ({
	generarPdf: jest.fn(async () =>
		Promise.resolve(new Blob(["%PDF-1.7"], { type: "application/pdf" })),
	),
}));

let contratoId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	contratoId = (
		await contratoService.crear(
			contratoDatos(clienteId, equipoId, { fechaInicio: "2026-07-01" }),
			"ana@hm.pe",
		)
	).contrato.id;
});

// Julio emitido con 114.40 h, como el acumulado anterior de la hoja VALORIZACION del xlsm.
async function julioEmitido() {
	const julio = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-07" },
		"ana@hm.pe",
		HOY,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(julio.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		julio.id,
		fila.contratoEquipoId,
		"114.4",
		"ana@hm.pe",
	);
	await valorizacionService.emitir(julio.id, "ana@hm.pe", "2026-08-03");
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

test("calcula la planilla del xlsm al escribir las horas, avisa si no llega al mínimo y lo guarda solo", async () => {
	const user = userEvent.setup();
	await julioEmitido();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "53,23");

	const planilla = screen.getByRole("region", { name: "Planilla de medición" });
	expect(within(planilla).getAllByText("USD 2,501.81").length).toBeGreaterThan(0);
	expect(within(planilla).getAllByText("USD 2,952.14").length).toBeGreaterThan(0);
	expect(screen.getByRole("alert")).toHaveTextContent("Menos horas que las horas mínimas");
	expect(screen.getByRole("alert")).toHaveTextContent("53.23 h de 150.00 h (faltan 96.77 h)");
	expect(screen.getAllByText("Faltan 96.77 h para el mínimo").length).toBeGreaterThan(0);
	const resumen = screen.getByRole("region", { name: "Resumen de la valorización" });
	expect(resumen).toHaveTextContent("USD -828.61");
	expect(resumen).toHaveTextContent("111.75 %");

	await waitFor(async () => {
		const items = await valorizacionRepository.items(agosto.id);
		expect(items[0]?.cantidadActual).toBe("53.23");
	});
	expect(await screen.findByText("Guardado en este equipo")).toBeInTheDocument();
});

test("agrega un ítem con su unidad de medida y lo suma al total", async () => {
	const user = userEvent.setup();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	await user.click((await screen.findAllByRole("button", { name: "Agregar ítem" }))[0]);
	await user.type(screen.getAllByLabelText("Descripción del ítem 2")[0], "Transporte de cisterna");
	await seleccionar(user, screen.getAllByLabelText("Unidad de medida del ítem 2")[0], "Viajes");
	await user.type(screen.getAllByLabelText("Cantidad del ítem 2")[0], "2");
	await user.type(screen.getAllByLabelText("Precio unitario del ítem 2")[0], "350");

	const planilla = screen.getByRole("region", { name: "Planilla de medición" });
	// 2 × 350.00 = 700.00 + 18 % de IGV = 826.00.
	expect(within(planilla).getAllByText("USD 826.00").length).toBeGreaterThan(0);
	await waitFor(async () => {
		expect((await valorizacionRepository.obtener(agosto.id))?.adicionales).toEqual([
			expect.objectContaining({
				descripcion: "TRANSPORTE DE CISTERNA",
				unidad: "VIAJES",
				cantidad: "2",
				precioUnitario: "350",
			}),
		]);
	});

	await user.click(screen.getAllByRole("button", { name: "Quitar el ítem 2" })[0]);
	await waitFor(async () => {
		expect((await valorizacionRepository.obtener(agosto.id))?.adicionales).toEqual([]);
	});
});

test("no emite con un ítem adicional incompleto", async () => {
	const user = userEvent.setup();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	await user.click((await screen.findAllByRole("button", { name: "Agregar ítem" }))[0]);
	await user.type(screen.getAllByLabelText("Descripción del ítem 2")[0], "Flete");
	await user.click(screen.getByRole("button", { name: "Emitir valorización" }));

	expect(
		await screen.findByText("Completa los ítems adicionales antes de emitir."),
	).toBeInTheDocument();
	expect(screen.getAllByText("Escribe la cantidad con números, como 2.").length).toBeGreaterThan(0);
	expect(screen.getAllByLabelText("Precio unitario del ítem 2")[0]).toHaveAttribute(
		"aria-invalid",
		"true",
	);
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("al llegar o pasar las horas mínimas no hay aviso", async () => {
	const user = userEvent.setup();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	expect(screen.getByRole("alert")).toHaveTextContent("0.00 h de 150.00 h (faltan 150.00 h)");

	await user.clear(horas);
	await user.type(horas, "160");

	expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	expect(screen.queryByText(/para el mínimo/)).not.toBeInTheDocument();
});

test("marca las horas inválidas y no las guarda", async () => {
	const user = userEvent.setup();
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${borrador.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "abc");

	expect(
		screen.getAllByText("Escribe las horas con números, como 120 o 53.5.").length,
	).toBeGreaterThan(0);
	expect(horas).toHaveAttribute("aria-invalid", "true");
	expect((await valorizacionRepository.items(borrador.id))[0]?.cantidadActual).toBe("0");
});

test("el listado muestra el borrador y lo descarta desde la planilla", async () => {
	const user = userEvent.setup();
	await valorizacionService.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe", HOY);
	renderRoute("/valorizaciones");

	const tabla = await screen.findByRole("table");
	expect(within(tabla).getByText("Agosto 2026")).toBeInTheDocument();
	expect(within(screen.getAllByRole("rowgroup")[1]).getByText("Borrador")).toBeInTheDocument();
	await user.click(within(tabla).getByRole("button", { name: "Continuar Agosto 2026 de CTR-001" }));

	await user.click(await screen.findByRole("button", { name: "Descartar" }));
	await user.click(
		within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Descartar" }),
	);

	expect(await screen.findByText("Borrador descartado.")).toBeInTheDocument();
	expect(await screen.findByText("No hay valorizaciones")).toBeInTheDocument();
});

async function agostoEmitido() {
	await julioEmitido();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(agosto.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		agosto.id,
		fila.contratoEquipoId,
		"53.23",
		"ana@hm.pe",
	);

	return valorizacionService.emitir(agosto.id, "ana@hm.pe", "2026-09-17");
}

test("emite con confirmación, avisa las horas bajo el mínimo y deja la planilla en solo lectura", async () => {
	const user = userEvent.setup();
	await julioEmitido();
	const agosto = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${agosto.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "53.23");
	await user.click(screen.getByRole("button", { name: "Emitir valorización" }));
	const confirmacion = await screen.findByRole("alertdialog");
	expect(confirmacion).toHaveTextContent("un equipo tiene menos horas que las horas mínimas");
	expect(confirmacion).toHaveTextContent("USD 2,952.14");
	await user.click(within(confirmacion).getByRole("button", { name: "Emitir" }));

	expect(await screen.findByText("Valorización 0002-2026 emitida.")).toBeInTheDocument();
	expect(await screen.findByText(/Emitida el/)).toBeInTheDocument();
	expect(screen.getAllByLabelText("Horas del periodo del ítem 1")[0]).toBeDisabled();
	expect(
		screen.getByText("DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS."),
	).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: "Emitir valorización" })).not.toBeInTheDocument();
});

test("no emite si no hay horas", async () => {
	const user = userEvent.setup();
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${borrador.id}`);

	await user.click(await screen.findByRole("button", { name: "Emitir valorización" }));

	expect(
		await screen.findByText("Ingresa las horas de al menos un equipo antes de emitir."),
	).toBeInTheDocument();
	expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("un administrador anula con motivo y la valorización muestra el motivo", async () => {
	const user = userEvent.setup();
	const emitida = await agostoEmitido();
	renderRoute(`/valorizaciones/${emitida.id}`);

	await user.click(await screen.findByRole("button", { name: "Anular" }));
	const dialogo = await screen.findByRole("dialog", { name: "Anular valorización 0002-2026" });
	await user.click(within(dialogo).getByRole("button", { name: "Anular" }));
	expect(await within(dialogo).findByText("Elige el motivo de la anulación.")).toBeInTheDocument();
	await user.click(within(dialogo).getByRole("radio", { name: /Error de cantidad/ }));
	expect(within(dialogo).queryByRole("textbox")).not.toBeInTheDocument();
	await user.click(within(dialogo).getByRole("button", { name: "Anular" }));

	expect(await screen.findByText("Valorización 0002-2026 anulada.")).toBeInTheDocument();
	expect(await screen.findByText("Motivo: Error de cantidad")).toBeInTheDocument();
	expect((await db.valorizaciones.get(emitida.id))?.estado).toBe("ANULADA");
});

test("al anular con «Otro motivo» hay que escribirlo", async () => {
	const user = userEvent.setup();
	const emitida = await agostoEmitido();
	renderRoute(`/valorizaciones/${emitida.id}`);

	await user.click(await screen.findByRole("button", { name: "Anular" }));
	const dialogo = await screen.findByRole("dialog", { name: "Anular valorización 0002-2026" });
	await user.click(within(dialogo).getByRole("radio", { name: /Otro motivo/ }));
	await user.click(within(dialogo).getByRole("button", { name: "Anular" }));
	expect(
		await within(dialogo).findByText("Escribe el motivo de la anulación."),
	).toBeInTheDocument();

	await user.type(
		within(dialogo).getByLabelText(/Describe el motivo/),
		"El cliente pidió reemitir con otra razón social",
	);
	await user.click(within(dialogo).getByRole("button", { name: "Anular" }));

	expect(
		await screen.findByText("Motivo: El cliente pidió reemitir con otra razón social"),
	).toBeInTheDocument();
});

test("un operador no ve el botón para anular", async () => {
	const emitida = await agostoEmitido();
	signInAs({ name: "Luis Mamani", email: "luis@hm.pe", rol: "OPERADOR" });
	renderRoute(`/valorizaciones/${emitida.id}`);

	expect(await screen.findByText(/Emitida el/)).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
});

test("el historial muestra el número y el total, y la ficha del contrato el avance", async () => {
	await agostoEmitido();
	renderRoute("/valorizaciones");

	const filas = within((await screen.findAllByRole("rowgroup"))[1]);
	expect(filas.getByText("0002-2026")).toBeInTheDocument();
	expect(filas.getByText("USD 2,952.14")).toBeInTheDocument();
	expect(filas.getAllByText("Emitida")).toHaveLength(2);
});

test("la ficha del contrato suma lo valorizado de las emitidas", async () => {
	await agostoEmitido();
	renderRoute(`/contratos/${contratoId}`);

	const resumen = await screen.findByRole("region", { name: "Resumen del contrato" });
	expect(resumen).toHaveTextContent("USD 7,878.61");
	expect(resumen).toHaveTextContent("USD -828.61");
	expect(resumen).toHaveTextContent("111.75 %");
});

test("descarga el PDF con el nombre de la valorización", async () => {
	const user = userEvent.setup();
	URL.createObjectURL = jest.fn(() => "blob:valorizacion");
	URL.revokeObjectURL = jest.fn();
	const emitida = await agostoEmitido();
	renderRoute(`/valorizaciones/${emitida.id}`);

	await user.click(await screen.findByRole("button", { name: "Descargar PDF" }));

	expect(await screen.findByText("Se descargó VAL-0002-2026-CTR-001.pdf.")).toBeInTheDocument();
	expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
});

test("al emitir y descargar en la misma pantalla, el PDF lleva el número asignado", async () => {
	const user = userEvent.setup();
	URL.createObjectURL = jest.fn(() => "blob:valorizacion");
	URL.revokeObjectURL = jest.fn();
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute(`/valorizaciones/${borrador.id}`);

	const [horas] = await screen.findAllByLabelText("Horas del periodo del ítem 1");
	await user.clear(horas);
	await user.type(horas, "10");
	await user.click(screen.getByRole("button", { name: "Emitir valorización" }));
	await user.click(
		within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Emitir" }),
	);
	await screen.findByText(/Emitida el/);
	await user.click(screen.getByRole("button", { name: "Descargar PDF" }));

	expect(
		await screen.findByText(`Se descargó VAL-0001-${new Date().getFullYear()}-CTR-001.pdf.`),
	).toBeInTheDocument();
});

test("el buscador del historial encuentra el periodo como se ve («agosto»)", async () => {
	const user = userEvent.setup();
	await valorizacionService.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe", HOY);
	await valorizacionService.crearBorrador({ contratoId, periodo: "2026-09" }, "ana@hm.pe", HOY);
	renderRoute("/valorizaciones");

	const tabla = await screen.findByRole("table");
	const [buscador] = screen.getAllByRole("searchbox", { name: "Buscar" });
	await user.type(buscador, "agosto");

	expect(within(tabla).getByText("Agosto 2026")).toBeInTheDocument();
	expect(within(tabla).queryByText("Septiembre 2026")).not.toBeInTheDocument();
});
