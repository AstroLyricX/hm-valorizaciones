import { uuidv7 } from "uuidv7";

import { ahoraIso } from "@/lib/fechas";

import {
	type Equipo,
	type EquipoDatosInput,
	EquipoDatosSchema,
	siguienteCodigoEquipo,
} from "../domain/equipo";
import type { EquipoRepository } from "../infrastructure/EquipoRepository";

export class PlacaDuplicadaError extends Error {
	constructor(
		readonly placa: string,
		readonly codigoExistente: string,
	) {
		super(`La placa ${placa} ya está registrada (${codigoExistente}).`);
		this.name = "PlacaDuplicadaError";
	}
}

export class EquipoService {
	constructor(private readonly repository: EquipoRepository) {}

	async listar(): Promise<Equipo[]> {
		return this.repository.listar();
	}

	async crear(datos: EquipoDatosInput, usuario: string): Promise<Equipo> {
		const validos = EquipoDatosSchema.parse(datos);
		await this.asegurarPlacaDisponible(validos.placa);

		const ahora = ahoraIso();
		const equipo: Equipo = {
			id: uuidv7(),
			codigo: siguienteCodigoEquipo(await this.repository.codigos()),
			...validos,
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		await this.repository.guardar(equipo);

		return equipo;
	}

	async actualizar(id: string, datos: EquipoDatosInput, usuario: string): Promise<Equipo> {
		const validos = EquipoDatosSchema.parse(datos);
		const actual = await this.repository.obtener(id);

		if (!actual || actual.deletedAt !== null) {
			throw new Error(`No existe el equipo ${id}.`);
		}
		await this.asegurarPlacaDisponible(validos.placa, id);

		const actualizado: Equipo = {
			...actual,
			...validos,
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizado);

		return actualizado;
	}

	// La placa es opcional (no toda la maquinaria la tiene), pero si se ingresa no puede repetirse.
	private async asegurarPlacaDisponible(placa: string, idPropio?: string): Promise<void> {
		if (placa === "") {
			return;
		}
		const existente = (await this.repository.listar()).find(
			(equipo) => equipo.placa === placa && equipo.id !== idPropio,
		);

		if (existente) {
			throw new PlacaDuplicadaError(placa, existente.codigo);
		}
	}
}
