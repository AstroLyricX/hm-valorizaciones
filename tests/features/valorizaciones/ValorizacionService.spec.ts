import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { EmpresaService } from "../../../src/features/configuracion/application/EmpresaService";
import { EmpresaRepository } from "../../../src/features/configuracion/infrastructure/EmpresaRepository";
import { ContratoService } from "../../../src/features/contratos/application/ContratoService";
import { ContratoRepository } from "../../../src/features/contratos/infrastructure/ContratoRepository";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import { ValorizacionService } from "../../../src/features/valorizaciones/application/ValorizacionService";
import { ValorizacionNoEditableError } from "../../../src/features/valorizaciones/domain/valorizacion";
import { ValorizacionRepository } from "../../../src/features/valorizaciones/infrastructure/ValorizacionRepository";
import { CLIENTE, excavadora } from "../../support/fixtures";
import { contratoDatos } from "../contratos/fixtures";

let database: HmDatabase;
let service: ValorizacionService;
let repository: ValorizacionRepository;
let contratoId: string;

beforeEach(async () => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	const terceroRepository = new TerceroRepository(database);
	const contratoRepository = new ContratoRepository(database);
	const equipoRepository = new EquipoRepository(database);
	repository = new ValorizacionRepository(database);
	service = new ValorizacionService(
		repository,
		contratoRepository,
		terceroRepository,
		equipoRepository,
		new EmpresaService(new EmpresaRepository(database)),
	);
	const clienteId = (await new TerceroService(terceroRepository).crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (
		await new EquipoService(equipoRepository).crear(excavadora(clienteId), "ana@hm.pe")
	).id;
	contratoId = (
		await new ContratoService(contratoRepository, terceroRepository).crear(
			contratoDatos(clienteId, equipoId, { fondoGarantiaPct: 5 }),
			"ana@hm.pe",
		)
	).contrato.id;
});

afterEach(async () => {
	await database.delete();
});

describe("ValorizacionService", () => {
	it("crea el borrador con la cabecera del contrato y el IGV de la configuración", async () => {
		const borrador = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");
		const planilla = await service.obtenerPlanilla(borrador.id);

		expect(borrador).toMatchObject({
			estado: "BORRADOR",
			numero: null,
			moneda: "USD",
			igvPct: 18,
			fondoGarantiaPct: 5,
			nombreServicio: "ALQUILER DE EQUIPO PESADO",
		});
		expect(planilla?.proveedor?.razonSocial).toBe("CONSTRUCTORA ANDINA SAC");
		expect(planilla?.empresa.ruc).toBe("20602629903");
		expect(planilla?.filas).toHaveLength(1);
		expect(planilla?.filas[0]).toMatchObject({ cantidadAnterior: "0", cantidadActual: "0" });
	});

	it("no duplica el borrador del mismo contrato y periodo", async () => {
		const primero = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");
		const segundo = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");

		expect(segundo.id).toBe(primero.id);
		expect(await database.valorizaciones.count()).toBe(1);
	});

	it("guarda las horas del periodo y toma lo anterior de las valorizaciones emitidas", async () => {
		const julio = await service.crearBorrador({ contratoId, periodo: "2026-07" }, "ana@hm.pe");
		const [fila] = (await service.obtenerPlanilla(julio.id))?.filas ?? [];
		await service.actualizarCantidad(julio.id, fila.contratoEquipo.id, "114.4", "ana@hm.pe");
		// La emisión llega en la fase 7: aquí se marca a mano.
		await repository.guardar({ ...julio, estado: "EMITIDA", numero: "0001-2026" });

		const agosto = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");
		await service.actualizarCantidad(agosto.id, fila.contratoEquipo.id, "53.23", "ana@hm.pe");

		expect((await service.obtenerPlanilla(agosto.id))?.filas[0]).toMatchObject({
			cantidadAnterior: "114.4",
			cantidadActual: "53.23",
		});
	});

	it("rechaza horas inválidas y no modifica una valorización emitida", async () => {
		const borrador = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");
		const [fila] = (await service.obtenerPlanilla(borrador.id))?.filas ?? [];

		await expect(
			service.actualizarCantidad(borrador.id, fila.contratoEquipo.id, "-3", "ana@hm.pe"),
		).rejects.toThrow();
		await repository.guardar({ ...borrador, estado: "EMITIDA" });
		await expect(
			service.actualizarCantidad(borrador.id, fila.contratoEquipo.id, "10", "ana@hm.pe"),
		).rejects.toBeInstanceOf(ValorizacionNoEditableError);
	});

	it("actualiza la cabecera y descarta un borrador sin borrarlo físicamente", async () => {
		const borrador = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe");

		const editada = await service.actualizarCabecera(
			borrador.id,
			{
				nombreServicio: "alquiler de volquete",
				plazoPago: "15 DÍAS",
				gastosGeneralesPct: 10,
				utilidadPct: 5,
				observaciones: "",
			},
			"luis@hm.pe",
		);
		expect(editada).toMatchObject({ nombreServicio: "ALQUILER DE VOLQUETE", version: 2 });

		await service.eliminarBorrador(borrador.id, "luis@hm.pe");
		expect(await service.listar()).toHaveLength(0);
		expect(await database.valorizaciones.count()).toBe(1);
		expect(await database.outbox.where("entidad").equals("valorizaciones").count()).toBe(3);
	});
});
