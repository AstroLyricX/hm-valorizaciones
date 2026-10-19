import { screen, within } from "@testing-library/react";

import { db } from "../../../src/data/db";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { valorizacionService } from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { CLIENTE, excavadora, HOY } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { contratoDatos } from "../contratos/fixtures";

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
});

test("sin datos muestra los indicadores en cero y nada pendiente", async () => {
	renderRoute("/");

	const indicadores = await screen.findByRole("region", { name: "Indicadores" });
	expect(within(indicadores).getAllByText("S/ 0.00")).toHaveLength(2);
	expect(screen.getByText("Ningún contrato supera el 90 % de lo contratado.")).toBeInTheDocument();
	expect(screen.getByText("No hay valorizaciones por terminar.")).toBeInTheDocument();
	expect(screen.getByText("Sin valorizaciones")).toBeInTheDocument();
});

test("muestra lo valorizado del mes, el contrato excedido, el borrador y la última emitida", async () => {
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	const { contrato } = await contratoService.crear(contratoDatos(clienteId, equipoId), "ana@hm.pe");
	// 160 h de 150 h: USD 7,520.00 + IGV = USD 8,873.60, emitida hoy.
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId: contrato.id, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		borrador.id,
		fila.contratoEquipoId,
		"160",
		"ana@hm.pe",
	);
	const emitida = await valorizacionService.emitir(borrador.id, "ana@hm.pe");
	await valorizacionService.crearBorrador(
		{ contratoId: contrato.id, periodo: "2026-09" },
		"ana@hm.pe",
		HOY,
	);
	renderRoute("/");

	const indicadores = await screen.findByRole("region", { name: "Indicadores" });
	expect(await within(indicadores).findByText("USD 8,873.60")).toBeInTheDocument();
	expect(within(indicadores).getByRole("link", { name: /Contratos activos/ })).toHaveTextContent(
		"1",
	);
	expect(within(indicadores).getByRole("link", { name: /Equipos en obra/ })).toHaveTextContent("1");

	const atencion = screen.getByRole("region", { name: "Contratos que requieren atención" });
	expect(atencion).toHaveTextContent("CTR-001");
	expect(atencion).toHaveTextContent("106.67 %");
	expect(
		within(atencion).getByRole("progressbar", { name: "Avance de CTR-001" }),
	).toBeInTheDocument();

	const borradores = screen.getByRole("region", { name: "Borradores pendientes" });
	expect(within(borradores).getByRole("link", { name: /Septiembre 2026/ })).toHaveAttribute(
		"href",
		expect.stringContaining("/valorizaciones/"),
	);

	const recientes = screen.getByRole("region", { name: "Valorizaciones recientes" });
	expect(within(recientes).getByText(emitida.numero ?? "")).toBeInTheDocument();
	expect(within(recientes).getByText("USD 8,873.60")).toBeInTheDocument();
});
