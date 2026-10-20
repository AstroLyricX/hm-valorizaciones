import { db } from "../../../src/data/db";
import {
	calcularAvisos,
	contratosParaTelegram,
	resumenNotificacion,
} from "../../../src/features/avisos/domain/avisos";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import {
	contratoRepository,
	contratoService,
} from "../../../src/features/contratos/application/contratoService.instance";
import { mensajeContrato } from "../../../src/features/contratos/domain/contrato";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { valorizacionService } from "../../../src/features/valorizaciones/application/valorizacionService.instance";
import { mensajeValorizacion } from "../../../src/features/valorizaciones/domain/valorizacion";
import { enlaceWhatsApp, numeroWhatsApp } from "../../../src/shared/lib/whatsapp";
import { CLIENTE, excavadora, volquete } from "../../support/fixtures";
import { contratoDatos, equipoDelContrato } from "../contratos/fixtures";

let osur: string;

beforeEach(async () => {
	await db.delete();
	await db.open();
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const excavadoraId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	const volqueteId = (await equipoService.crear(volquete(clienteId), "ana@hm.pe")).id;
	// OSUR: 01/08/2026 al 31/12/2026, 150 h × USD 47.00.
	osur = (await contratoService.crear(contratoDatos(clienteId, excavadoraId), "ana@hm.pe")).contrato
		.id;
	// Vencido: no avisa aunque esté al 100 %.
	await contratoService.crear(
		contratoDatos(clienteId, volqueteId, {
			proyecto: "Antiguo",
			fechaInicio: "2025-01-01",
			fechaFin: "2025-12-31",
			equipos: [equipoDelContrato(volqueteId, { horasMinimas: "10" })],
		}),
		"ana@hm.pe",
	);
});

async function avisos(hoy: string) {
	return calcularAvisos({
		contratos: await contratoRepository.listar(),
		valorizaciones: await valorizacionService.listar(),
		terceros: await clienteService.listar(),
		hoy,
	});
}

async function emitir(periodo: string, horas: string, fecha: string) {
	const borrador = await valorizacionService.crearBorrador(
		{ contratoId: osur, periodo },
		"ana@hm.pe",
		`${periodo}-15`,
	);
	const [fila] = (await valorizacionService.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizacionService.actualizarCantidad(
		borrador.id,
		fila.contratoEquipoId,
		horas,
		"ana@hm.pe",
	);

	return valorizacionService.emitir(borrador.id, "ana@hm.pe", fecha);
}

describe("calcularAvisos", () => {
	it("sin pendientes no hay avisos", async () => {
		expect(await avisos("2026-09-15")).toEqual([]);
	});

	it("avisa la última semana del contrato y el aviso cambia con los días", async () => {
		expect(await avisos("2026-12-23")).toEqual([]);

		const [aviso] = await avisos("2026-12-28");

		expect(aviso).toMatchObject({
			tipo: "CONTRATO_POR_VENCER",
			titulo: "Vence en 3 días: CTR-001",
			ruta: `/contratos/${osur}`,
			nivel: "alerta",
		});
		// El id no cambia entre días: no vuelve a notificarse.
		expect((await avisos("2026-12-30"))[0].id).toBe(aviso.id);
	});

	it("avisa el contrato al 90 % y el excedido, los borradores y las emitidas recientes", async () => {
		const agosto = await emitir("2026-08", "140", "2026-09-02");
		const septiembre = await valorizacionService.crearBorrador(
			{ contratoId: osur, periodo: "2026-09" },
			"ana@hm.pe",
			"2026-09-05",
		);

		const lista = await avisos("2026-09-05");

		expect(lista.map((aviso) => aviso.tipo)).toEqual([
			"AVANCE_90",
			"BORRADOR_PENDIENTE",
			"VALORIZACION_EMITIDA",
		]);
		expect(lista[0]).toMatchObject({ titulo: "CTR-001 está por agotarse", nivel: "alerta" });
		expect(lista[1]).toMatchObject({
			titulo: "Borrador sin emitir: Septiembre 2026",
			ruta: `/valorizaciones/${septiembre.id}`,
		});
		expect(lista[2]).toMatchObject({ titulo: `Emitida ${agosto.numero ?? ""}` });
		// Pasada una semana la emitida ya no se avisa.
		expect((await avisos("2026-09-10")).map((aviso) => aviso.tipo)).not.toContain(
			"VALORIZACION_EMITIDA",
		);

		await valorizacionService.actualizarCantidad(
			septiembre.id,
			(await valorizacionService.obtenerPlanilla(septiembre.id))?.filas[0].contratoEquipoId ?? "",
			"20",
			"ana@hm.pe",
		);
		await valorizacionService.emitir(septiembre.id, "ana@hm.pe", "2026-09-20");

		expect((await avisos("2026-09-20"))[0]).toMatchObject({
			tipo: "HORAS_EXCEDIDAS",
			titulo: "CTR-001 supera lo contratado",
		});
	});

	it("resume varios avisos en una sola notificación", async () => {
		await emitir("2026-08", "140", "2026-09-02");
		const lista = await avisos("2026-12-28");

		expect(resumenNotificacion(lista.slice(0, 1))).toEqual({
			titulo: lista[0].titulo,
			cuerpo: lista[0].detalle,
		});
		expect(resumenNotificacion(lista)).toEqual({
			titulo: "2 avisos nuevos",
			cuerpo: "Vence en 3 días: CTR-001\nCTR-001 está por agotarse",
		});
	});
});

describe("contratosParaTelegram", () => {
	it("sube los vigentes e indica si falta la valorización de su último mes", async () => {
		const datos = async () =>
			contratosParaTelegram({
				contratos: await contratoRepository.listar(),
				valorizaciones: await valorizacionService.listar(),
				terceros: await clienteService.listar(),
				hoy: "2026-12-20",
			});

		expect(await datos()).toEqual([
			{
				id: osur,
				codigo: "CTR-001",
				proyecto: "GESTIÓN GENERAL DE SUBCONTRATOS - OSUR",
				cliente: "CONSTRUCTORA ANDINA SAC",
				fechaFin: "2026-12-31",
				periodo: "Diciembre 2026",
				pendiente: true,
			},
		]);

		await emitir("2026-12", "10", "2026-12-20");

		expect((await datos())[0].pendiente).toBe(false);
	});
});

describe("WhatsApp", () => {
	it("arma el número internacional de un celular peruano", () => {
		expect(numeroWhatsApp("987 654 321")).toBe("51987654321");
		expect(numeroWhatsApp("+51 987-654-321")).toBe("51987654321");
		expect(numeroWhatsApp("01 4567890")).toBeNull();
		expect(numeroWhatsApp("")).toBeNull();
	});

	it("el enlace lleva el mensaje y, si hay, el número", () => {
		expect(enlaceWhatsApp("Hola H&M", "987654321")).toBe(
			"https://wa.me/51987654321?text=Hola%20H%26M",
		);
		expect(enlaceWhatsApp("Hola")).toBe("https://wa.me/?text=Hola");
	});

	it("resume la valorización emitida y el contrato", async () => {
		const agosto = await emitir("2026-08", "53.23", "2026-09-17");
		const contrato = await contratoRepository.obtener(osur);
		if (!contrato) {
			throw new Error("Falta el contrato");
		}

		expect(mensajeValorizacion(agosto, contrato)).toBe(
			[
				`*Valorización N.° ${agosto.numero ?? ""}* · H&M`,
				"Contrato CTR-001 · GESTIÓN GENERAL DE SUBCONTRATOS - OSUR",
				"Periodo: Agosto 2026",
				"Total: USD 2,952.14",
				"Neto a pagar: USD 2,952.14",
			].join("\n"),
		);
		expect(mensajeContrato(contrato)).toBe(
			[
				"*Contrato CTR-001* · H&M",
				"GESTIÓN GENERAL DE SUBCONTRATOS - OSUR · ASILLO - SAN ANTÓN",
				"Vigencia: 01/08/2026 al 31/12/2026",
				"Monto contractual: USD 7,050.00",
			].join("\n"),
		);
	});
});
