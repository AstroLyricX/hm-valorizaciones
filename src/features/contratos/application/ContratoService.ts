import { uuidv7 } from "uuidv7";

import type { TerceroRepository } from "@/features/clientes/infrastructure/TerceroRepository";
import { ahoraIso } from "@/lib/fechas";

import {
	type Contrato,
	type ContratoDatos,
	ContratoDatosSchema,
	type ContratoEquipo,
	montoContractual,
	siguienteCodigoContrato,
} from "../domain/contrato";
import type { ContratoRepository } from "../infrastructure/ContratoRepository";

export interface ContratoDetalle {
	contrato: Contrato;
	equipos: ContratoEquipo[];
}

export class ClienteNoValidoError extends Error {
	constructor() {
		super("El cliente no existe o está inactivo.");
		this.name = "ClienteNoValidoError";
	}
}

export class ContratoService {
	constructor(
		private readonly repository: ContratoRepository,
		private readonly terceros: TerceroRepository,
	) {}

	async listar(): Promise<Contrato[]> {
		return this.repository.listar();
	}

	async obtenerDetalle(id: string): Promise<ContratoDetalle | undefined> {
		const contrato = await this.repository.obtener(id);

		if (!contrato || contrato.deletedAt !== null) {
			return undefined;
		}

		return { contrato, equipos: await this.repository.equipos(id) };
	}

	async crear(datos: ContratoDatos, usuario: string): Promise<ContratoDetalle> {
		const { equipos, ...cabecera } = ContratoDatosSchema.parse(datos);
		await this.asegurarCliente(cabecera.terceroId);

		const ahora = ahoraIso();
		const contrato: Contrato = {
			id: uuidv7(),
			codigo: siguienteCodigoContrato(await this.repository.codigos()),
			...cabecera,
			montoContractual: montoContractual(equipos),
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		const nuevos = equipos.map(({ id: _id, ...equipo }, index): ContratoEquipo => ({
			...equipo,
			id: uuidv7(),
			contratoId: contrato.id,
			orden: index + 1,
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		}));
		await this.repository.guardar(contrato, nuevos);

		return { contrato, equipos: nuevos };
	}

	// Actualiza la cabecera y sincroniza los equipos: modifica los existentes, agrega los nuevos
	// y marca como eliminados (borrado lógico) los que se quitaron.
	async actualizar(id: string, datos: ContratoDatos, usuario: string): Promise<ContratoDetalle> {
		const actual = await this.obtenerDetalle(id);

		if (!actual) {
			throw new Error(`No existe el contrato ${id}.`);
		}
		const { equipos, ...cabecera } = ContratoDatosSchema.parse(datos);

		if (cabecera.terceroId !== actual.contrato.terceroId) {
			await this.asegurarCliente(cabecera.terceroId);
		}

		const ahora = ahoraIso();
		const existentes = new Map(actual.equipos.map((equipo) => [equipo.id, equipo]));
		const vigentes = equipos.map((equipo, index): ContratoEquipo => {
			const previo = equipo.id ? existentes.get(equipo.id) : undefined;
			const { id: _id, ...valores } = equipo;

			return previo
				? {
						...previo,
						...valores,
						orden: index + 1,
						updatedAt: ahora,
						updatedBy: usuario,
						version: previo.version + 1,
					}
				: {
						...valores,
						id: uuidv7(),
						contratoId: id,
						orden: index + 1,
						createdAt: ahora,
						updatedAt: ahora,
						updatedBy: usuario,
						deletedAt: null,
						version: 1,
					};
		});
		const idsVigentes = new Set(vigentes.map((equipo) => equipo.id));
		const quitados = actual.equipos
			.filter((equipo) => !idsVigentes.has(equipo.id))
			.map((equipo) => ({
				...equipo,
				deletedAt: ahora,
				updatedAt: ahora,
				updatedBy: usuario,
				version: equipo.version + 1,
			}));

		const contrato: Contrato = {
			...actual.contrato,
			...cabecera,
			montoContractual: montoContractual(equipos),
			updatedAt: ahora,
			updatedBy: usuario,
			version: actual.contrato.version + 1,
		};
		await this.repository.guardar(contrato, [...vigentes, ...quitados]);

		return { contrato, equipos: vigentes };
	}

	private async asegurarCliente(terceroId: string): Promise<void> {
		const tercero = await this.terceros.obtener(terceroId);

		if (!tercero || tercero.deletedAt !== null || tercero.estado !== "ACTIVO") {
			throw new ClienteNoValidoError();
		}
	}
}
