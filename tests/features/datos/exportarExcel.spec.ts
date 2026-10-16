import { read, utils } from "xlsx";

import { db } from "../../../src/data/db";
import {
	clienteService,
	proveedorService,
} from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { datosExportacion } from "../../../src/features/datos/application/datosExportacion";
import { escribirExcel } from "../../../src/features/datos/application/escribirExcel";
import { libroExcel } from "../../../src/features/datos/domain/libroExcel";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { valorizacionService } from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { CLIENTE, excavadora, HUISE, volquete } from "../../support/fixtures";
import { contratoDatos, equipoDelContrato } from "../contratos/fixtures";

beforeEach(async () => {
	await db.delete();
	await db.open();
});

function leer(buffer: ArrayBuffer) {
	const libro = read(buffer, { type: "array", cellDates: true });
	const hoja = (nombre: string) =>
		utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[nombre], { defval: null });

	return { nombres: libro.SheetNames, hoja, libro };
}

test("sin datos exporta las siete hojas con sus encabezados", async () => {
	const { nombres, libro } = leer(escribirExcel(libroExcel(await datosExportacion())));

	expect(nombres).toEqual([
		"CLIENTES",
		"PROVEEDORES",
		"EQUIPOS",
		"CONTRATOS",
		"EQUIPOS_CONTRATO",
		"VALORIZACIONES",
		"DET_VALORIZACIONES",
	]);
	const [encabezado] = utils.sheet_to_json<string[]>(libro.Sheets.CLIENTES, { header: 1 });
	expect(encabezado).toEqual(expect.arrayContaining(["Código", "Razón social", "RUC", "CCI"]));
});

test("exporta todos los registros sin perder datos", async () => {
	const andina = await clienteService.crear(
		{ ...CLIENTE, banco: "BCP", cci: "00219100123456789012", representanteEstadoCivil: "CASADO" },
		"ana@hm.pe",
	);
	await proveedorService.crear(HUISE, "ana@hm.pe");
	const excavadoraId = (await equipoService.crear(excavadora(andina.id), "ana@hm.pe")).id;
	const volqueteId = (await equipoService.crear(volquete(andina.id), "ana@hm.pe")).id;
	const { contrato, equipos } = await contratoService.crear(
		contratoDatos(andina.id, excavadoraId, {
			fondoGarantiaPct: 5,
			equipos: [
				equipoDelContrato(excavadoraId),
				equipoDelContrato(volqueteId, { horasMinimas: "20.5", costoHora: 85050 }),
			],
		}),
		"ana@hm.pe",
	);
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId: contrato.id, periodo: "2026-08" },
		"ana@hm.pe",
	);
	await valorizacionService.actualizarCantidad(borrador.id, equipos[0].id, "53.23", "ana@hm.pe");
	await valorizacionService.emitir(borrador.id, "ana@hm.pe", "2026-09-17");
	await valorizacionService.crearBorrador(
		{ contratoId: contrato.id, periodo: "2026-09" },
		"ana@hm.pe",
	);

	const { hoja, libro } = leer(escribirExcel(libroExcel(await datosExportacion())));

	expect(hoja("CLIENTES")).toHaveLength(1);
	expect(hoja("PROVEEDORES")).toEqual([
		expect.objectContaining({
			Código: "PRO-001",
			"Razón social": "HUISE QUEA ANTOLIN",
			"Código de equipos": "HQA",
		}),
	]);
	expect(hoja("CLIENTES")[0]).toMatchObject({
		Código: "CLI-001",
		"Razón social": "CONSTRUCTORA ANDINA SAC",
		RUC: "20602629903",
		Correo: "obras@andina.pe",
		Estado: "Activo",
		"DNI del representante": "40123456",
		"Estado civil": "Casado(a)",
		Banco: "BCP",
		CCI: "00219100123456789012",
	});
	expect(hoja("EQUIPOS")[1]).toMatchObject({
		"Activo fijo": "CA002",
		Descripción: "VOLQUETE",
		Placa: "V3K-882",
		Año: 2019,
		Estado: "PR · Por recibir",
		Dueño: "CONSTRUCTORA ANDINA SAC",
	});
	const [filaContrato] = hoja("CONTRATOS");
	expect(filaContrato).toMatchObject({
		Código: "CTR-001",
		Tipo: "Emitido",
		"Cliente o proveedor": "CONSTRUCTORA ANDINA SAC",
		Moneda: "USD",
		"Monto contractual": 7050 + 17435.25,
		"Fondo de garantía (%)": 5,
	});
	// Excel muestra la fecha tal cual, sin desfase de zona horaria.
	const [encabezados, filaCruda] = utils.sheet_to_json<string[]>(libro.Sheets.CONTRATOS, {
		header: 1,
		raw: false,
	});
	expect(filaCruda[encabezados.indexOf("Fecha de inicio")]).toBe("01/08/2026");
	expect(hoja("EQUIPOS_CONTRATO")).toEqual([
		expect.objectContaining({ Contrato: "CTR-001", Ítem: 1, "Horas mínimas": 150, Parcial: 7050 }),
		expect.objectContaining({
			Ítem: 2,
			"Horas mínimas": 20.5,
			"Costo por hora": 850.5,
			Parcial: 17435.25,
		}),
	]);
	// La emitida y el borrador; solo la emitida tiene totales y detalle.
	expect(hoja("VALORIZACIONES")).toHaveLength(2);
	expect(hoja("VALORIZACIONES").find((fila) => fila.Estado === "Emitida")).toMatchObject({
		"N.° valorización": "0001-2026",
		Periodo: "Agosto 2026",
		"Subtotal 1": 2501.81,
		IGV: 450.33,
		"Total factura": 2952.14,
		"Fondo de garantía": 125.09,
		"Neto a pagar": 2827.05,
		"Monto en letras": "DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS.",
	});
	expect(hoja("DET_VALORIZACIONES")).toEqual([
		expect.objectContaining({
			"N.° valorización": "0001-2026",
			Ítem: 1,
			Descripción: "EXCAVADORA CAT 340 - ALQUILER",
			"Cant. actual": 53.23,
			"Importe actual": 2501.81,
		}),
		expect.objectContaining({ Ítem: 2, "Cant. actual": 0, "Importe actual": 0 }),
	]);
});
