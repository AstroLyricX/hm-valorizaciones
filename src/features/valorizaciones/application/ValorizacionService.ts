import { uuidv7 } from "uuidv7";

import type { Tercero } from "@/features/clientes/domain/tercero";
import type { TerceroRepository } from "@/features/clientes/infrastructure/TerceroRepository";
import type { EmpresaService } from "@/features/configuracion/application/EmpresaService";
import type { Empresa } from "@/features/configuracion/domain/empresa";
import type { Contrato, ContratoEquipo } from "@/features/contratos/domain/contrato";
import type { ContratoRepository } from "@/features/contratos/infrastructure/ContratoRepository";
import type { Equipo } from "@/features/equipos/domain/equipo";
import type { EquipoRepository } from "@/features/equipos/infrastructure/EquipoRepository";
import { ahoraIso } from "@/lib/fechas";

import {
	CABECERA_INICIAL,
	CantidadSchema,
	type NuevaValorizacion,
	NuevaValorizacionSchema,
	sumarCantidades,
	type Valorizacion,
	type ValorizacionCabecera,
	ValorizacionCabeceraSchema,
	type ValorizacionItem,
	ValorizacionNoEditableError,
} from "../domain/valorizacion";
import type { ValorizacionRepository } from "../infrastructure/ValorizacionRepository";

// Una fila de la planilla: el equipo del contrato con sus horas anteriores y del periodo.
export interface FilaPlanilla {
	contratoEquipo: ContratoEquipo;
	equipo: Equipo | undefined;
	cantidadAnterior: string;
	cantidadActual: string;
}

export interface Planilla {
	valorizacion: Valorizacion;
	contrato: Contrato;
	proveedor: Tercero | undefined;
	empresa: Empresa;
	filas: FilaPlanilla[];
}

export class ContratoNoEncontradoError extends Error {
	constructor() {
		super("El contrato no existe.");
		this.name = "ContratoNoEncontradoError";
	}
}

export class ValorizacionService {
	constructor(
		private readonly repository: ValorizacionRepository,
		private readonly contratos: ContratoRepository,
		private readonly terceros: TerceroRepository,
		private readonly equipos: EquipoRepository,
		private readonly empresa: EmpresaService,
	) {}

	async listar(): Promise<Valorizacion[]> {
		return this.repository.listar();
	}

	// Crea el borrador del periodo con la cabecera del contrato y la configuración (P11).
	// Si ya hay un borrador del mismo contrato y periodo, lo devuelve para no duplicarlo.
	async crearBorrador(datos: NuevaValorizacion, usuario: string): Promise<Valorizacion> {
		const { contratoId, periodo } = NuevaValorizacionSchema.parse(datos);
		const contrato = await this.contratos.obtener(contratoId);

		if (!contrato || contrato.deletedAt !== null) {
			throw new ContratoNoEncontradoError();
		}
		const existente = (await this.repository.delContrato(contratoId)).find(
			(valorizacion) => valorizacion.periodo === periodo && valorizacion.estado === "BORRADOR",
		);
		if (existente) {
			return existente;
		}

		const [empresa, equiposDelContrato] = await Promise.all([
			this.empresa.obtener(),
			this.contratos.equipos(contratoId),
		]);
		const ahora = ahoraIso();
		const base = {
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		const valorizacion: Valorizacion = {
			id: uuidv7(),
			contratoId,
			periodo,
			...CABECERA_INICIAL,
			numero: null,
			fechaEmision: null,
			estado: "BORRADOR",
			moneda: contrato.moneda,
			igvPct: empresa.igvPorcentaje,
			fondoGarantiaPct: contrato.fondoGarantiaPct,
			...base,
		};
		const items: ValorizacionItem[] = equiposDelContrato.map((contratoEquipo) => ({
			id: uuidv7(),
			valorizacionId: valorizacion.id,
			contratoEquipoId: contratoEquipo.id,
			cantidadActual: "0",
			...base,
		}));
		await this.repository.guardar(valorizacion, items);

		return valorizacion;
	}

	async obtenerPlanilla(id: string): Promise<Planilla | undefined> {
		const valorizacion = await this.repository.obtener(id);

		if (!valorizacion || valorizacion.deletedAt !== null) {
			return undefined;
		}
		const contrato = await this.contratos.obtener(valorizacion.contratoId);
		if (!contrato) {
			return undefined;
		}

		const [proveedor, empresa, equiposDelContrato, equipos, items, anteriores] = await Promise.all([
			this.terceros.obtener(contrato.terceroId),
			this.empresa.obtener(),
			this.contratos.equipos(contrato.id),
			this.equipos.listar(),
			this.repository.items(id),
			this.horasAnteriores(valorizacion),
		]);
		const porEquipo = new Map(equipos.map((equipo) => [equipo.id, equipo]));
		const actuales = new Map(items.map((item) => [item.contratoEquipoId, item.cantidadActual]));

		return {
			valorizacion,
			contrato,
			proveedor,
			empresa,
			// Un equipo agregado al contrato después de crear el borrador aparece con 0 horas.
			filas: equiposDelContrato.map((contratoEquipo) => ({
				contratoEquipo,
				equipo: porEquipo.get(contratoEquipo.equipoId),
				cantidadAnterior: anteriores.get(contratoEquipo.id) ?? "0",
				cantidadActual: actuales.get(contratoEquipo.id) ?? "0",
			})),
		};
	}

	// Guarda las horas del periodo de un equipo (se llama mientras el usuario escribe).
	async actualizarCantidad(
		id: string,
		contratoEquipoId: string,
		cantidad: string,
		usuario: string,
	): Promise<void> {
		const cantidadActual = CantidadSchema.parse(cantidad);
		await this.borrador(id);

		const existente = (await this.repository.items(id)).find(
			(item) => item.contratoEquipoId === contratoEquipoId,
		);
		const ahora = ahoraIso();
		await this.repository.guardarItem(
			existente
				? {
						...existente,
						cantidadActual,
						updatedAt: ahora,
						updatedBy: usuario,
						version: existente.version + 1,
					}
				: {
						id: uuidv7(),
						valorizacionId: id,
						contratoEquipoId,
						cantidadActual,
						createdAt: ahora,
						updatedAt: ahora,
						updatedBy: usuario,
						deletedAt: null,
						version: 1,
					},
		);
	}

	async actualizarCabecera(
		id: string,
		datos: ValorizacionCabecera,
		usuario: string,
	): Promise<Valorizacion> {
		const cabecera = ValorizacionCabeceraSchema.parse(datos);
		const actual = await this.borrador(id);
		const actualizada: Valorizacion = {
			...actual,
			...cabecera,
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizada);

		return actualizada;
	}

	// Un borrador se puede descartar; las emitidas solo se anulan (fase 7).
	async eliminarBorrador(id: string, usuario: string): Promise<void> {
		const actual = await this.borrador(id);
		const ahora = ahoraIso();
		await this.repository.guardar({
			...actual,
			deletedAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			version: actual.version + 1,
		});
	}

	private async borrador(id: string): Promise<Valorizacion> {
		const actual = await this.repository.obtener(id);

		if (!actual || actual.deletedAt !== null) {
			throw new Error(`No existe la valorización ${id}.`);
		}
		if (actual.estado !== "BORRADOR") {
			throw new ValorizacionNoEditableError();
		}

		return actual;
	}

	// Cantidad anterior (P5): suma de las horas de las valorizaciones EMITIDAS del contrato
	// de periodos anteriores, por equipo del contrato.
	private async horasAnteriores(valorizacion: Valorizacion): Promise<Map<string, string>> {
		const emitidas = (await this.repository.delContrato(valorizacion.contratoId)).filter(
			(otra) => otra.estado === "EMITIDA" && otra.periodo < valorizacion.periodo,
		);
		if (emitidas.length === 0) {
			return new Map();
		}

		const porEquipo = new Map<string, string[]>();
		for (const item of await this.repository.itemsDe(emitidas.map((otra) => otra.id))) {
			porEquipo.set(item.contratoEquipoId, [
				...(porEquipo.get(item.contratoEquipoId) ?? []),
				item.cantidadActual,
			]);
		}

		return new Map(
			[...porEquipo].map(([contratoEquipoId, cantidades]) => [
				contratoEquipoId,
				sumarCantidades(cantidades),
			]),
		);
	}
}
