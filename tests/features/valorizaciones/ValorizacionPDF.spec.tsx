import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import { db } from "../../../src/data/db";
import {
	clienteService,
	proveedorService,
} from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { calcularPlanilla } from "../../../src/features/valorizaciones/application/ValorizacionService";
import { valorizacionService } from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { nombreArchivoPdf } from "../../../src/features/valorizaciones/pdf/datosPdf";
import { ValorizacionPDF } from "../../../src/features/valorizaciones/pdf/ValorizacionPDF";
import { CLIENTE, excavadora, HOY, HUISE } from "../../support/fixtures";
import { contratoDatos } from "../contratos/fixtures";

// El PDF real se genera en el navegador (Cypress lo descarga). Aquí las primitivas de
// react-pdf se reemplazan por elementos HTML para revisar el contenido.
jest.mock("@react-pdf/renderer", () => {
	const contenedor =
		(etiqueta: string) =>
		({
			children,
			render,
		}: {
			children?: ReactNode;
			render?: (pagina: { pageNumber: number; totalPages: number }) => string;
		}) => (
			<div data-pdf={etiqueta}>{render ? render({ pageNumber: 1, totalPages: 1 }) : children}</div>
		);

	return {
		Document: contenedor("document"),
		Page: contenedor("page"),
		View: contenedor("view"),
		Text: contenedor("text"),
		Image: ({ src }: { src: string }) => <img alt="Logo" src={src} />,
		StyleSheet: { create: <T,>(estilos: T) => estilos },
	};
});

let contratoId: string;

beforeEach(async () => {
	await db.delete();
	await db.open();
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	contratoId = (await contratoService.crear(contratoDatos(clienteId, equipoId), "ana@hm.pe"))
		.contrato.id;
});

async function planillaEmitida() {
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		borrador.id,
		fila.contratoEquipoId,
		"53.23",
		"ana@hm.pe",
	);
	await valorizacionService.emitir(borrador.id, "ana@hm.pe", "2026-09-17");
	const planilla = await valorizacionService.obtenerPlanilla(borrador.id);
	if (!planilla) {
		throw new Error("Sin planilla");
	}

	return planilla;
}

test("el PDF tiene la cabecera, la planilla, el total en letras y las firmas del xlsm", async () => {
	const planilla = await planillaEmitida();
	render(
		<ValorizacionPDF
			planilla={planilla}
			calculo={calcularPlanilla(planilla)}
			logo="/logo-hm.png"
		/>,
	);

	expect(screen.getByText("VALORIZACIÓN DE EQUIPOS N.° 0001-2026")).toBeInTheDocument();
	expect(screen.queryByText(/CANTERAS/)).not.toBeInTheDocument();
	expect(screen.getByText("0001-2026")).toBeInTheDocument();
	expect(screen.getByText("17/09/2026")).toBeInTheDocument();
	expect(screen.getByText("AGOSTO 2026")).toBeInTheDocument();
	expect(
		screen.getByText("MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L."),
	).toBeInTheDocument();
	expect(screen.getByText("EXCAVADORA CAT 340 - ALQUILER")).toBeInTheDocument();
	expect(screen.getAllByText("2,501.81").length).toBeGreaterThan(0);
	expect(screen.getAllByText("2,952.14").length).toBeGreaterThan(0);
	expect(
		screen.getByText("DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS."),
	).toBeInTheDocument();
	expect(screen.getByText("GERENTE ADMINISTRATIVO")).toBeInTheDocument();
	// Contrato emitido: el cliente contrata a H&M, que es el proveedor.
	expect(screen.getByText(/CONSTRUCTORA ANDINA SAC\s+CONTRATANTE/)).toBeInTheDocument();
	expect(screen.getByText(/H & M E\.I\.R\.L\.\s+PROVEEDOR/)).toBeInTheDocument();
	expect(screen.getByText("EMISIÓN")).toBeInTheDocument();
	expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
	expect(screen.queryByText("BORRADOR")).not.toBeInTheDocument();
});

test("un borrador lleva marca de agua y su periodo en el nombre del archivo", async () => {
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	const planilla = await valorizacionService.obtenerPlanilla(borrador.id);
	if (!planilla) {
		throw new Error("Sin planilla");
	}
	render(
		<ValorizacionPDF
			planilla={planilla}
			calculo={calcularPlanilla(planilla)}
			logo="/logo-hm.png"
		/>,
	);

	expect(screen.getAllByText("BORRADOR")).toHaveLength(2);
	expect(screen.getByText("VALORIZACIÓN DE EQUIPOS")).toBeInTheDocument();
	expect(nombreArchivoPdf(planilla)).toBe("VAL-BORRADOR-2026-08-CTR-001.pdf");
});

test("el PDF lista los ítems adicionales con su unidad de medida", async () => {
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	await valorizacionService.actualizarAdicionales(
		borrador.id,
		[
			{
				id: "ad-1",
				descripcion: "Transporte de cisterna",
				unidad: "VIAJES",
				cantidad: "2",
				precioUnitario: "350",
			},
		],
		"ana@hm.pe",
	);
	const planilla = await valorizacionService.obtenerPlanilla(borrador.id);
	if (!planilla) {
		throw new Error("Sin planilla");
	}
	render(
		<ValorizacionPDF
			planilla={planilla}
			calculo={calcularPlanilla(planilla)}
			logo="/logo-hm.png"
		/>,
	);

	expect(screen.getByText("TRANSPORTE DE CISTERNA")).toBeInTheDocument();
	expect(screen.getByText("VJE")).toBeInTheDocument();
	expect(screen.getAllByText("700.00").length).toBeGreaterThan(0);
});

test("el archivo de una emitida se llama VAL-número-contrato.pdf", async () => {
	expect(nombreArchivoPdf(await planillaEmitida())).toBe("VAL-0001-2026-CTR-001.pdf");
});

test("en una valorización de recepción H&M es el contratante y el proveedor cobra", async () => {
	const proveedorId = (await proveedorService.crear(HUISE, "ana@hm.pe")).id;
	const equipoId = (
		await equipoService.crear(excavadora(proveedorId, { placa: "HUI-010" }), "ana@hm.pe")
	).id;
	const { contrato } = await contratoService.crear(
		contratoDatos(proveedorId, equipoId, { tipo: "RECIBIDO" }),
		"ana@hm.pe",
	);
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId: contrato.id, periodo: "2026-08" },
		"ana@hm.pe",
		HOY,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		borrador.id,
		fila.contratoEquipoId,
		"53.23",
		"ana@hm.pe",
	);
	await valorizacionService.emitir(borrador.id, "ana@hm.pe", "2026-09-17");
	const planilla = await valorizacionService.obtenerPlanilla(borrador.id);
	if (!planilla) {
		throw new Error("Sin planilla");
	}
	render(
		<ValorizacionPDF
			planilla={planilla}
			calculo={calcularPlanilla(planilla)}
			logo="/logo-hm.png"
		/>,
	);

	expect(screen.getByText("R-0001-2026")).toBeInTheDocument();
	expect(screen.getByText("RECEPCIÓN")).toBeInTheDocument();
	expect(screen.getByText(/H & M E\.I\.R\.L\.\s+CONTRATANTE/)).toBeInTheDocument();
	expect(screen.getByText(/HUISE QUEA ANTOLIN\s+PROVEEDOR/)).toBeInTheDocument();
});
