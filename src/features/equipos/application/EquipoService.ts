import { uuidv7 } from "uuidv7";

import { sugerirPrefijo, type Tercero } from "@/features/clientes/domain/tercero";
import { ahoraIso } from "@/lib/fechas";

import { PREFIJO_PROPIO, siguienteActivoFijo } from "../domain/activoFijo";
import {
	ActivoFijoDuplicadoError,
	type Equipo,
	type EquipoDatos,
	type EquipoDatosInput,
	EquipoDatosSchema,
	PlacaDuplicadaError,
} from "../domain/equipo";
import type { EquipoRepository } from "../infrastructure/EquipoRepository";

// Lo que el servicio necesita de los proveedores: el código de equipos del dueño.
export interface DuenosDeEquipos {
	obtener(id: string): Promise<Tercero | undefined>;
}

export class EquipoService {
	constructor(
		private readonly repository: EquipoRepository,
		private readonly duenos: DuenosDeEquipos,
	) {}

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
			activoFijo: await this.nuevoActivoFijo(validos),
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

		// El activo fijo se conserva; solo cambia si el equipo pasa a otro dueño.
		const mismoDueno = actual.propiedad === validos.propiedad && actual.duenoId === validos.duenoId;
		const actualizado: Equipo = {
			...actual,
			...validos,
			activoFijo: mismoDueno ? actual.activoFijo : await this.nuevoActivoFijo(validos, id),
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizado);

		return actualizado;
	}

	// Código del dueño (HM o el del proveedor) + el siguiente número de sus equipos.
	async siguienteActivoFijo(datos: Pick<EquipoDatos, "propiedad" | "duenoId">): Promise<string> {
		const activosFijos = (await this.repository.listar()).map((equipo) => equipo.activoFijo);

		return siguienteActivoFijo(await this.prefijoDe(datos), activosFijos);
	}

	private async prefijoDe({ propiedad, duenoId }: Pick<EquipoDatos, "propiedad" | "duenoId">) {
		if (propiedad === "PROPIO") {
			return PREFIJO_PROPIO;
		}
		const dueno = await this.duenos.obtener(duenoId);
		if (!dueno) {
			throw new Error(`No existe el proveedor ${duenoId}.`);
		}

		return dueno.prefijoEquipos || sugerirPrefijo(dueno.razonSocial);
	}

	private async nuevoActivoFijo(datos: EquipoDatos, idPropio?: string): Promise<string> {
		const activoFijo = await this.siguienteActivoFijo(datos);
		const otros = (await this.repository.listar()).filter((equipo) => equipo.id !== idPropio);
		// Respaldo: otro dispositivo pudo registrar el mismo código antes de sincronizar.
		if (otros.some((equipo) => equipo.activoFijo === activoFijo)) {
			throw new ActivoFijoDuplicadoError(activoFijo);
		}

		return activoFijo;
	}

	// La placa identifica al equipo liviano: no puede repetirse. Los pesados no llevan placa.
	private async asegurarUnicos(datos: EquipoDatos, idPropio?: string): Promise<void> {
		if (datos.placa === "") {
			return;
		}
		const otros = (await this.repository.listar()).filter((equipo) => equipo.id !== idPropio);
		const conPlaca = otros.find((equipo) => equipo.placa === datos.placa);
		if (conPlaca) {
			throw new PlacaDuplicadaError(datos.placa, conPlaca.activoFijo);
		}
	}
}
