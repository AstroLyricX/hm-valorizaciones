import { uuidv7 } from "uuidv7";

import { ahoraIso } from "@/lib/fechas";

import {
	type EstadoTercero,
	RucDuplicadoError,
	siguienteCodigo,
	type Tercero,
	type TerceroDatosInput,
	TerceroDatosSchema,
} from "../domain/tercero";
import type { TerceroRepository } from "../infrastructure/TerceroRepository";

export class TerceroService {
	constructor(private readonly repository: TerceroRepository) {}

	async listar(): Promise<Tercero[]> {
		return this.repository.listar();
	}

	async crear(datos: TerceroDatosInput, usuario: string): Promise<Tercero> {
		const validos = TerceroDatosSchema.parse(datos);
		await this.asegurarRucDisponible(validos.ruc);

		const ahora = ahoraIso();
		const tercero: Tercero = {
			id: uuidv7(),
			codigo: siguienteCodigo(await this.repository.codigos()),
			...validos,
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		await this.repository.guardar(tercero);

		return tercero;
	}

	async actualizar(id: string, datos: TerceroDatosInput, usuario: string): Promise<Tercero> {
		const validos = TerceroDatosSchema.parse(datos);
		const actual = await this.obtenerExistente(id);
		await this.asegurarRucDisponible(validos.ruc, id);

		return this.guardarCambios(actual, validos, usuario);
	}

	// No se borra: se desactiva para conservar el historial de contratos y valorizaciones.
	async cambiarEstado(id: string, estado: EstadoTercero, usuario: string): Promise<Tercero> {
		return this.guardarCambios(await this.obtenerExistente(id), { estado }, usuario);
	}

	private async guardarCambios(
		actual: Tercero,
		cambios: Partial<Tercero>,
		usuario: string,
	): Promise<Tercero> {
		const actualizado: Tercero = {
			...actual,
			...cambios,
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizado);

		return actualizado;
	}

	private async obtenerExistente(id: string): Promise<Tercero> {
		const tercero = await this.repository.obtener(id);

		if (!tercero || tercero.deletedAt !== null) {
			throw new Error(`No existe el registro ${id}.`);
		}

		return tercero;
	}

	private async asegurarRucDisponible(ruc: string, idPropio?: string): Promise<void> {
		const existente = await this.repository.buscarPorRuc(ruc);

		if (existente && existente.id !== idPropio) {
			throw new RucDuplicadoError(ruc, existente.codigo);
		}
	}
}
