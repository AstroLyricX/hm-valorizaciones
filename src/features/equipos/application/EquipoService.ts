import { uuidv7 } from "uuidv7";

import { ahoraIso } from "@/lib/fechas";

import {
	ActivoFijoDuplicadoError,
	type Equipo,
	type EquipoDatos,
	type EquipoDatosInput,
	EquipoDatosSchema,
	PlacaDuplicadaError,
} from "../domain/equipo";
import type { EquipoRepository } from "../infrastructure/EquipoRepository";

export class EquipoService {
	constructor(private readonly repository: EquipoRepository) {}

	async listar(): Promise<Equipo[]> {
		return this.repository.listar();
	}

	async crear(datos: EquipoDatosInput, usuario: string): Promise<Equipo> {
		const validos = EquipoDatosSchema.parse(datos);
		await this.asegurarUnicos(validos);

		const ahora = ahoraIso();
		const equipo: Equipo = {
			id: uuidv7(),
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
		await this.asegurarUnicos(validos, id);

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

	// El activo fijo y la placa identifican al equipo: no pueden repetirse.
	private async asegurarUnicos(datos: EquipoDatos, idPropio?: string): Promise<void> {
		const otros = (await this.repository.listar()).filter((equipo) => equipo.id !== idPropio);

		if (otros.some((equipo) => equipo.activoFijo === datos.activoFijo)) {
			throw new ActivoFijoDuplicadoError(datos.activoFijo);
		}
		const conPlaca = otros.find((equipo) => equipo.placa === datos.placa);
		if (conPlaca) {
			throw new PlacaDuplicadaError(datos.placa, conPlaca.activoFijo);
		}
	}
}
