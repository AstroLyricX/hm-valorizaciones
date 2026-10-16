import { uuidv7 } from "uuidv7";

import { ahoraIso } from "@/lib/fechas";

import {
	type EstadoTercero,
	PrefijoEquiposDuplicadoError,
	RucDuplicadoError,
	siguienteCodigo,
	sugerirPrefijo,
	type Tercero,
	type TerceroDatos,
	type TerceroDatosInput,
	TerceroDatosSchema,
	type TipoTercero,
} from "../domain/tercero";
import type { TerceroRepository } from "../infrastructure/TerceroRepository";

// Un servicio por lista (clientes o proveedores) sobre el mismo repositorio.
export class TerceroService {
	constructor(
		private readonly repository: TerceroRepository,
		readonly tipo: TipoTercero = "CLIENTE",
	) {}

	async listar(): Promise<Tercero[]> {
		return this.repository.listar(this.tipo);
	}

	async crear(datos: TerceroDatosInput, usuario: string): Promise<Tercero> {
		const validos = await this.conPrefijo(TerceroDatosSchema.parse(datos));
		await this.asegurarRucDisponible(validos.ruc);

		const ahora = ahoraIso();
		const tercero: Tercero = {
			id: uuidv7(),
			tipo: this.tipo,
			codigo: siguienteCodigo(await this.repository.codigos(this.tipo), this.tipo),
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
		const actual = await this.obtenerExistente(id);
		const validos = await this.conPrefijo(TerceroDatosSchema.parse(datos), actual);
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

		if (!tercero || tercero.deletedAt !== null || tercero.tipo !== this.tipo) {
			throw new Error(`No existe el registro ${id}.`);
		}

		return tercero;
	}

	// Código de equipos: solo para proveedores, único entre ellos. Si se deja vacío se conserva el
	// que tenía o se genera con las iniciales de la razón social.
	private async conPrefijo(datos: TerceroDatos, actual?: Tercero): Promise<TerceroDatos> {
		if (this.tipo !== "PROVEEDOR") {
			return { ...datos, prefijoEquipos: "" };
		}
		const otros = (await this.repository.listar("PROVEEDOR")).filter(
			(proveedor) => proveedor.id !== actual?.id && proveedor.prefijoEquipos !== "",
		);
		const prefijo =
			[datos.prefijoEquipos, actual?.prefijoEquipos ?? ""].find((codigo) => codigo !== "") ??
			sugerirPrefijo(
				datos.razonSocial,
				otros.map((proveedor) => proveedor.prefijoEquipos),
			);
		const repetido = otros.find((proveedor) => proveedor.prefijoEquipos === prefijo);
		if (repetido) {
			throw new PrefijoEquiposDuplicadoError(prefijo, repetido.codigo);
		}

		return { ...datos, prefijoEquipos: prefijo };
	}

	private async asegurarRucDisponible(ruc: string, idPropio?: string): Promise<void> {
		const existente = await this.repository.buscarPorRuc(ruc, this.tipo);

		if (existente && existente.id !== idPropio) {
			throw new RucDuplicadoError(ruc, existente.codigo);
		}
	}
}
