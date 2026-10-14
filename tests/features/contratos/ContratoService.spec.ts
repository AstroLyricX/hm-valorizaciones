import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import {
	ClienteNoValidoError,
	ContratoService,
} from "../../../src/features/contratos/application/ContratoService";
import { ContratoRepository } from "../../../src/features/contratos/infrastructure/ContratoRepository";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import { CLIENTE, contratoDatos, equipoDelContrato, excavadora, volquete } from "./fixtures";

let database: HmDatabase;
let service: ContratoService;
let terceros: TerceroService;
let clienteId: string;
let excavadoraId: string;
let volqueteId: string;

beforeEach(async () => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	const terceroRepository = new TerceroRepository(database);
	terceros = new TerceroService(terceroRepository);
	const equipos = new EquipoService(new EquipoRepository(database));
	service = new ContratoService(new ContratoRepository(database), terceroRepository);
	clienteId = (await terceros.crear(CLIENTE, "ana@hm.pe")).id;
	excavadoraId = (await equipos.crear(excavadora(clienteId), "ana@hm.pe")).id;
	volqueteId = (await equipos.crear(volquete(clienteId), "ana@hm.pe")).id;
});

afterEach(async () => {
	await database.delete();
});

describe("ContratoService", () => {
	it("crea el contrato con código CTR-001, sus equipos en orden y el monto calculado", async () => {
		const { contrato, equipos } = await service.crear(
			contratoDatos(clienteId, excavadoraId, {
				equipos: [
					equipoDelContrato(excavadoraId),
					equipoDelContrato(volqueteId, { horasMinimas: "200", costoHora: 8500 }),
				],
			}),
			"ana@hm.pe",
		);

		expect(contrato).toMatchObject({
			codigo: "CTR-001",
			montoContractual: 705000 + 1700000,
			version: 1,
		});
		expect(equipos.map((equipo) => equipo.orden)).toEqual([1, 2]);
		expect(await database.contratoEquipos.where("contratoId").equals(contrato.id).count()).toBe(2);
	});

	it("rechaza un cliente inactivo", async () => {
		await terceros.cambiarEstado(clienteId, "INACTIVO", "ana@hm.pe");

		await expect(
			service.crear(contratoDatos(clienteId, excavadoraId), "ana@hm.pe"),
		).rejects.toBeInstanceOf(ClienteNoValidoError);
		expect(await database.contratos.count()).toBe(0);
	});

	it("al editar modifica, agrega y quita equipos con borrado lógico", async () => {
		const creado = await service.crear(
			contratoDatos(clienteId, excavadoraId, {
				equipos: [equipoDelContrato(excavadoraId), equipoDelContrato(volqueteId)],
			}),
			"ana@hm.pe",
		);
		const [primero] = creado.equipos;

		const editado = await service.actualizar(
			creado.contrato.id,
			contratoDatos(clienteId, excavadoraId, {
				equipos: [{ ...equipoDelContrato(excavadoraId, { horasMinimas: "200" }), id: primero.id }],
			}),
			"luis@hm.pe",
		);

		expect(editado.contrato).toMatchObject({
			version: 2,
			montoContractual: 940000,
			updatedBy: "luis@hm.pe",
		});
		expect(editado.equipos[0].id).toBe(primero.id);
		const todos = await database.contratoEquipos
			.where("contratoId")
			.equals(creado.contrato.id)
			.toArray();
		expect(todos).toHaveLength(2);
		expect(
			todos.filter((equipo) => equipo.deletedAt !== null).map((equipo) => equipo.equipoId),
		).toEqual([volqueteId]);
	});

	it("deja la cabecera y los equipos pendientes de sincronizar", async () => {
		await service.crear(contratoDatos(clienteId, excavadoraId), "ana@hm.pe");

		expect(await database.outbox.where("entidad").equals("contratos").count()).toBe(1);
		expect(await database.outbox.where("entidad").equals("contratoEquipos").count()).toBe(1);
	});

	it("no acepta un proveedor como cliente del contrato", async () => {
		const proveedor = await new TerceroService(new TerceroRepository(database), "PROVEEDOR").crear(
			{ ...CLIENTE, ruc: "10098637074" },
			"ana@hm.pe",
		);

		await expect(
			service.crear(contratoDatos(proveedor.id, excavadoraId), "ana@hm.pe"),
		).rejects.toBeInstanceOf(ClienteNoValidoError);
	});
});
