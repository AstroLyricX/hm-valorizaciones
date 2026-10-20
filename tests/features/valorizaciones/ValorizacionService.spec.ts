import { HmDatabase } from "../../../src/data/db";
import { TerceroService } from "../../../src/features/clientes/application/TerceroService";
import { TerceroRepository } from "../../../src/features/clientes/infrastructure/TerceroRepository";
import { EmpresaService } from "../../../src/features/configuracion/application/EmpresaService";
import { EmpresaRepository } from "../../../src/features/configuracion/infrastructure/EmpresaRepository";
import { ContratoService } from "../../../src/features/contratos/application/ContratoService";
import { ContratoRepository } from "../../../src/features/contratos/infrastructure/ContratoRepository";
import { EquipoService } from "../../../src/features/equipos/application/EquipoService";
import { EquipoRepository } from "../../../src/features/equipos/infrastructure/EquipoRepository";
import {
	AdicionalesIncompletosError,
	ContratoNoVigenteError,
	NoAnuladaError,
	PeriodoFueraDeVigenciaError,
	SinHorasError,
	SinPermisoError,
	ValorizacionService,
} from "../../../src/features/valorizaciones/application/ValorizacionService";
import {
	CABECERA_INICIAL,
	ValorizacionNoEditableError,
} from "../../../src/features/valorizaciones/domain/valorizacion";
import { ValorizacionRepository } from "../../../src/features/valorizaciones/infrastructure/ValorizacionRepository";
import { CLIENTE, excavadora, HOY } from "../../support/fixtures";
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
		await new EquipoService(equipoRepository, terceroRepository).crear(
			excavadora(clienteId),
			"ana@hm.pe",
		)
	).id;
	contratoId = (
		await new ContratoService(contratoRepository, terceroRepository).crear(
			contratoDatos(clienteId, equipoId, { fondoGarantiaPct: 5, fechaInicio: "2026-07-01" }),
			"ana@hm.pe",
		)
	).contrato.id;
});

afterEach(async () => {
	await database.delete();
});

describe("ValorizacionService", () => {
	it("guarda los ítems adicionales, los valida al emitir y los congela", async () => {
		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const viaje = {
			id: "ad-1",
			descripcion: "transporte de cisterna",
			unidad: "VIAJES" as const,
			cantidad: "2",
			precioUnitario: "350",
		};
		const vacio = {
			id: "ad-2",
			descripcion: "",
			unidad: "HORAS" as const,
			cantidad: "",
			precioUnitario: "",
		};

		await service.actualizarAdicionales(
			agosto.id,
			[viaje, { ...vacio, cantidad: "1" }],
			"ana@hm.pe",
		);
		await expect(service.emitir(agosto.id, "ana@hm.pe", "2026-09-02")).rejects.toBeInstanceOf(
			AdicionalesIncompletosError,
		);

		await service.actualizarAdicionales(agosto.id, [viaje, vacio], "ana@hm.pe");
		const emitida = await service.emitir(agosto.id, "ana@hm.pe", "2026-09-02");

		// Solo el viaje (la fila vacía se descarta): 2 × 350.00, sin horas de equipos.
		expect(emitida.adicionales).toEqual([
			{ ...viaje, descripcion: "TRANSPORTE DE CISTERNA", precioUnitario: "350" },
		]);
		expect(emitida.totales).toMatchObject({ subtotal1: 70000, adicionales: 70000 });

		const septiembre = await service.crearBorrador(
			{ contratoId, periodo: "2026-09" },
			"ana@hm.pe",
			HOY,
		);
		const planilla = await service.obtenerPlanilla(septiembre.id);
		expect(planilla?.adicionalesAnteriores).toBe(70000);
		expect(planilla?.valorizacion.adicionales).toEqual([]);
	});

	it("no crea valorizaciones de contratos vencidos o que aún no empiezan", async () => {
		await expect(
			service.crearBorrador({ contratoId, periodo: "2026-12" }, "ana@hm.pe", "2027-01-01"),
		).rejects.toMatchObject({ vigencia: "VENCIDO" });
		await expect(
			service.crearBorrador({ contratoId, periodo: "2026-07" }, "ana@hm.pe", "2026-06-30"),
		).rejects.toBeInstanceOf(ContratoNoVigenteError);
		expect(await database.valorizaciones.count()).toBe(0);
	});

	it("no crea valorizaciones de un periodo fuera de la vigencia", async () => {
		await expect(
			service.crearBorrador({ contratoId, periodo: "2027-01" }, "ana@hm.pe", HOY),
		).rejects.toBeInstanceOf(PeriodoFueraDeVigenciaError);
		await expect(
			service.crearBorrador({ contratoId, periodo: "2026-06" }, "ana@hm.pe", HOY),
		).rejects.toThrow("01/07/2026 al 31/12/2026");
	});

	it("un borrador creado mientras estaba vigente se puede retomar después de vencer", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-12" },
			"ana@hm.pe",
			"2026-12-20",
		);

		await expect(
			service.crearBorrador({ contratoId, periodo: "2026-12" }, "ana@hm.pe", "2027-01-05"),
		).resolves.toMatchObject({ id: borrador.id });
	});

	it("crea el borrador con la cabecera del contrato y el IGV de la configuración", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
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
		const primero = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const segundo = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);

		expect(segundo.id).toBe(primero.id);
		expect(await database.valorizaciones.count()).toBe(1);
	});

	it("guarda las horas del periodo y toma lo anterior de las valorizaciones emitidas", async () => {
		const julio = await service.crearBorrador({ contratoId, periodo: "2026-07" }, "ana@hm.pe", HOY);
		const [fila] = (await service.obtenerPlanilla(julio.id))?.filas ?? [];
		await service.actualizarCantidad(julio.id, fila.contratoEquipoId, "114.4", "ana@hm.pe");
		await service.emitir(julio.id, "ana@hm.pe", "2026-08-03");

		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "53.23", "ana@hm.pe");

		expect((await service.obtenerPlanilla(agosto.id))?.filas[0]).toMatchObject({
			cantidadAnterior: "114.4",
			cantidadActual: "53.23",
		});
	});

	it("rechaza horas inválidas y no modifica una valorización emitida", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const [fila] = (await service.obtenerPlanilla(borrador.id))?.filas ?? [];

		await expect(
			service.actualizarCantidad(borrador.id, fila.contratoEquipoId, "-3", "ana@hm.pe"),
		).rejects.toThrow();
		await service.actualizarCantidad(borrador.id, fila.contratoEquipoId, "10", "ana@hm.pe");
		await service.emitir(borrador.id, "ana@hm.pe");
		await expect(
			service.actualizarCantidad(borrador.id, fila.contratoEquipoId, "10", "ana@hm.pe"),
		).rejects.toBeInstanceOf(ValorizacionNoEditableError);
	});

	it("actualiza la cabecera y descarta un borrador sin borrarlo físicamente", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);

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

	it("al emitir asigna el correlativo del año y congela totales, IGV y monto en letras", async () => {
		const julio = await service.crearBorrador({ contratoId, periodo: "2026-07" }, "ana@hm.pe", HOY);
		const [fila] = (await service.obtenerPlanilla(julio.id))?.filas ?? [];
		await service.actualizarCantidad(julio.id, fila.contratoEquipoId, "114.4", "ana@hm.pe");
		const primera = await service.emitir(julio.id, "ana@hm.pe", "2026-08-03");

		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "53.23", "ana@hm.pe");
		const segunda = await service.emitir(agosto.id, "ana@hm.pe", "2026-09-17");

		expect(primera.numero).toBe("0001-2026");
		expect(segunda).toMatchObject({
			estado: "EMITIDA",
			numero: "0002-2026",
			fechaEmision: "2026-09-17",
			montoEnLetras: "DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS.",
		});
		// Fondo de garantía del contrato: 5 % del subtotal 2.
		expect(segunda.totales).toEqual({
			subtotal1: 250181,
			gastosGenerales: 0,
			utilidad: 0,
			subtotal2: 250181,
			igv: 45033,
			total: 295214,
			fondoGarantia: 12509,
			netoPagable: 282705,
			adicionales: 0,
		});
	});

	it("la emitida conserva sus datos aunque luego cambie el contrato o la configuración", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const [fila] = (await service.obtenerPlanilla(borrador.id))?.filas ?? [];
		await service.actualizarCantidad(borrador.id, fila.contratoEquipoId, "53.23", "ana@hm.pe");
		await service.emitir(borrador.id, "ana@hm.pe");
		await database.contratoEquipos.update(fila.contratoEquipoId, { costoHora: 9900 });

		const emitida = await service.obtenerPlanilla(borrador.id);
		expect(emitida?.filas[0]).toMatchObject({
			precioUnitario: 4700,
			cantidadContractual: "150",
			descripcion: "EXCAVADORA CAT 340 - ALQUILER",
		});
	});

	it("no emite sin horas", async () => {
		const borrador = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);

		await expect(service.emitir(borrador.id, "ana@hm.pe")).rejects.toBeInstanceOf(SinHorasError);
	});

	it("solo un administrador anula, con motivo; la anulada no suma horas y otro periodo no toma su número", async () => {
		const julio = await service.crearBorrador({ contratoId, periodo: "2026-07" }, "ana@hm.pe", HOY);
		const [fila] = (await service.obtenerPlanilla(julio.id))?.filas ?? [];
		await service.actualizarCantidad(julio.id, fila.contratoEquipoId, "114.4", "ana@hm.pe");
		await service.emitir(julio.id, "ana@hm.pe", "2026-08-03");

		await expect(
			service.anular(julio.id, "Horas mal cargadas", "luis@hm.pe", "OPERADOR"),
		).rejects.toBeInstanceOf(SinPermisoError);
		await expect(service.anular(julio.id, "", "ana@hm.pe", "ADMIN")).rejects.toThrow();
		const anulada = await service.anular(julio.id, "Horas mal cargadas", "ana@hm.pe", "ADMIN");
		expect(anulada).toMatchObject({ estado: "ANULADA", motivoAnulacion: "Horas mal cargadas" });

		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		expect((await service.obtenerPlanilla(agosto.id))?.filas[0].cantidadAnterior).toBe("0");
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "10", "ana@hm.pe");
		expect((await service.emitir(agosto.id, "ana@hm.pe", "2026-09-01")).numero).toBe("0002-2026");
	});

	it("la corrección de una anulada copia sus datos y se emite con el mismo número", async () => {
		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const [fila] = (await service.obtenerPlanilla(agosto.id))?.filas ?? [];
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "120", "ana@hm.pe");
		await service.actualizarCabecera(
			agosto.id,
			{ ...CABECERA_INICIAL, observaciones: "Frente 2" },
			"ana@hm.pe",
		);
		await service.actualizarAdicionales(
			agosto.id,
			[
				{
					id: "ad-1",
					descripcion: "FLETE",
					unidad: "VIAJES",
					cantidad: "1",
					precioUnitario: "300",
				},
			],
			"ana@hm.pe",
		);
		expect((await service.emitir(agosto.id, "ana@hm.pe", "2026-09-02")).numero).toBe("0001-2026");
		const septiembre = await service.crearBorrador(
			{ contratoId, periodo: "2026-09" },
			"ana@hm.pe",
			HOY,
		);
		await service.actualizarCantidad(septiembre.id, fila.contratoEquipoId, "10", "ana@hm.pe");
		expect((await service.emitir(septiembre.id, "ana@hm.pe", "2026-10-01")).numero).toBe(
			"0002-2026",
		);
		await service.anular(agosto.id, "Error de cantidad", "ana@hm.pe", "ADMIN");

		const correccion = await service.reemitir(agosto.id, "luis@hm.pe");
		// Volver a pedirla abre la misma corrección.
		expect((await service.reemitir(agosto.id, "luis@hm.pe")).id).toBe(correccion.id);
		const planilla = await service.obtenerPlanilla(correccion.id);
		expect(planilla).toMatchObject({
			numeroReemision: "0001-2026",
			valorizacion: {
				estado: "BORRADOR",
				periodo: "2026-08",
				reemplazaA: agosto.id,
				observaciones: "Frente 2",
				adicionales: [expect.objectContaining({ descripcion: "FLETE", precioUnitario: "300" })],
			},
		});
		expect(planilla?.filas[0].cantidadActual).toBe("120");
		expect((await service.obtenerPlanilla(agosto.id))?.correccion).toMatchObject({
			id: correccion.id,
			estado: "BORRADOR",
		});

		await service.actualizarCantidad(correccion.id, fila.contratoEquipoId, "100", "luis@hm.pe");
		const reemitida = await service.emitir(correccion.id, "luis@hm.pe", "2026-10-15");
		expect(reemitida.numero).toBe("0001-2026");
		// La numeración sigue sin saltos ni repetidos.
		const octubre = await service.crearBorrador(
			{ contratoId, periodo: "2026-10" },
			"ana@hm.pe",
			HOY,
		);
		await service.actualizarCantidad(octubre.id, fila.contratoEquipoId, "5", "ana@hm.pe");
		expect((await service.emitir(octubre.id, "ana@hm.pe", "2026-10-20")).numero).toBe("0003-2026");
	});

	it("una nueva valorización del mismo contrato y periodo también conserva el número", async () => {
		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		const [fila] = (await service.obtenerPlanilla(agosto.id))?.filas ?? [];
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "120", "ana@hm.pe");
		await service.emitir(agosto.id, "ana@hm.pe", "2026-09-02");
		await service.anular(agosto.id, "Error de periodo", "ana@hm.pe", "ADMIN");

		const nueva = await service.crearBorrador({ contratoId, periodo: "2026-08" }, "ana@hm.pe", HOY);
		await service.actualizarCantidad(nueva.id, fila.contratoEquipoId, "80", "ana@hm.pe");

		expect((await service.emitir(nueva.id, "ana@hm.pe", "2026-09-05")).numero).toBe("0001-2026");
		// Ya reemitida, una segunda anulación y corrección vuelve a usar el mismo número.
		await service.anular(nueva.id, "Error de cantidad", "ana@hm.pe", "ADMIN");
		const otra = await service.reemitir(nueva.id, "ana@hm.pe");
		await service.actualizarCantidad(otra.id, fila.contratoEquipoId, "90", "ana@hm.pe");
		expect((await service.emitir(otra.id, "ana@hm.pe", "2026-09-06")).numero).toBe("0001-2026");
	});

	it("solo se reemite una anulada, aunque el contrato ya haya vencido", async () => {
		const agosto = await service.crearBorrador(
			{ contratoId, periodo: "2026-08" },
			"ana@hm.pe",
			HOY,
		);
		await expect(service.reemitir(agosto.id, "ana@hm.pe")).rejects.toBeInstanceOf(NoAnuladaError);
		const [fila] = (await service.obtenerPlanilla(agosto.id))?.filas ?? [];
		await service.actualizarCantidad(agosto.id, fila.contratoEquipoId, "120", "ana@hm.pe");
		await service.emitir(agosto.id, "ana@hm.pe", "2026-09-02");
		await service.anular(agosto.id, "Error de contrato", "ana@hm.pe", "ADMIN");
		await database.contratos.update(contratoId, { fechaFin: "2026-08-31" });

		await expect(service.reemitir(agosto.id, "ana@hm.pe")).resolves.toMatchObject({
			estado: "BORRADOR",
			reemplazaA: agosto.id,
		});
	});
});
