import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { EmpresaService } from "../../../src/features/configuracion/application/EmpresaService";
import { EmpresaRepository } from "../../../src/features/configuracion/infrastructure/EmpresaRepository";
import {
	ClienteNoValidoError,
	ContratoService,
} from "../../../src/features/contratos/application/ContratoService";
import { ContratoRepository } from "../../../src/features/contratos/infrastructure/ContratoRepository";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import {
	partesDe,
	ValorizacionService,
} from "../../../src/features/valorizaciones/application/ValorizacionService";
import { ValorizacionRepository } from "../../../src/features/valorizaciones/infrastructure/ValorizacionRepository";
import { CLIENTE, excavadora, HUISE } from "../../support/fixtures";
import { contratoDatos } from "./fixtures";

let database: HmDatabase;
let contratos: ContratoService;
let valorizaciones: ValorizacionService;
let clienteId: string;
let proveedorId: string;
let equipoId: string;

beforeEach(async () => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	const terceros = new TerceroRepository(database);
	const contratoRepository = new ContratoRepository(database);
	const equipoRepository = new EquipoRepository(database);
	contratos = new ContratoService(contratoRepository, terceros);
	valorizaciones = new ValorizacionService(
		new ValorizacionRepository(database),
		contratoRepository,
		terceros,
		equipoRepository,
		new EmpresaService(new EmpresaRepository(database)),
	);
	clienteId = (await new TerceroService(terceros, "CLIENTE").crear(CLIENTE, "ana@hm.pe")).id;
	proveedorId = (await new TerceroService(terceros, "PROVEEDOR").crear(HUISE, "ana@hm.pe")).id;
	equipoId = (
		await new EquipoService(equipoRepository, terceros).crear(excavadora(proveedorId), "ana@hm.pe")
	).id;
});

afterEach(async () => {
	await database.delete();
});

async function emitida(contratoId: string, periodo: string) {
	const borrador = await valorizaciones.crearBorrador({ contratoId, periodo }, "ana@hm.pe");
	const [fila] = (await valorizaciones.obtenerPlanilla(borrador.id))?.filas ?? [];
	await valorizaciones.actualizarCantidad(borrador.id, fila.contratoEquipoId, "10", "ana@hm.pe");

	return valorizaciones.emitir(borrador.id, "ana@hm.pe", "2026-09-17");
}

describe("tipo de contrato", () => {
	it("un contrato emitido es con un cliente y uno recibido con un proveedor", async () => {
		await expect(
			contratos.crear(contratoDatos(proveedorId, equipoId, { tipo: "EMITIDO" }), "ana@hm.pe"),
		).rejects.toBeInstanceOf(ClienteNoValidoError);
		await expect(
			contratos.crear(contratoDatos(clienteId, equipoId, { tipo: "RECIBIDO" }), "ana@hm.pe"),
		).rejects.toBeInstanceOf(ClienteNoValidoError);

		const recibido = await contratos.crear(
			contratoDatos(proveedorId, equipoId, { tipo: "RECIBIDO" }),
			"ana@hm.pe",
		);
		expect(recibido.contrato.tipo).toBe("RECIBIDO");
	});

	it("en la emitida H&M es el proveedor; en la recibida, el contratante (como el xlsm)", async () => {
		const emitido = await contratos.crear(contratoDatos(clienteId, equipoId), "ana@hm.pe");
		const recibido = await contratos.crear(
			contratoDatos(proveedorId, equipoId, { tipo: "RECIBIDO" }),
			"ana@hm.pe",
		);
		const deEmision = await valorizaciones.obtenerPlanilla(
			(await emitida(emitido.contrato.id, "2026-08")).id,
		);
		const deRecepcion = await valorizaciones.obtenerPlanilla(
			(await emitida(recibido.contrato.id, "2026-08")).id,
		);
		if (!deEmision || !deRecepcion) {
			throw new Error("Sin planillas");
		}

		expect(partesDe(deEmision)).toMatchObject({
			contratante: { razonSocial: "CONSTRUCTORA ANDINA SAC" },
			proveedor: { razonSocial: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L." },
		});
		expect(partesDe(deRecepcion)).toMatchObject({
			contratante: { razonSocial: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L." },
			proveedor: { razonSocial: "HUISE QUEA ANTOLIN", ruc: "10098637074" },
		});
	});

	it("las valorizaciones de recepción llevan su propia serie R-", async () => {
		const emitido = await contratos.crear(contratoDatos(clienteId, equipoId), "ana@hm.pe");
		const recibido = await contratos.crear(
			contratoDatos(proveedorId, equipoId, { tipo: "RECIBIDO" }),
			"ana@hm.pe",
		);

		expect((await emitida(emitido.contrato.id, "2026-08")).numero).toBe("0001-2026");
		expect((await emitida(recibido.contrato.id, "2026-08")).numero).toBe("R-0001-2026");
		expect((await emitida(recibido.contrato.id, "2026-09")).numero).toBe("R-0002-2026");
		expect((await emitida(emitido.contrato.id, "2026-09")).numero).toBe("0002-2026");
	});
});
