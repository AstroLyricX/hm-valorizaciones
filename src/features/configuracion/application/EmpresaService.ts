import { ahoraIso } from "@/lib/fechas";

import {
	type Empresa,
	EMPRESA_ID,
	EMPRESA_INICIAL,
	type EmpresaDatos,
	EmpresaDatosSchema,
} from "../domain/empresa";
import type { EmpresaRepository } from "../infrastructure/EmpresaRepository";

const USUARIO_SISTEMA = "sistema";

export class EmpresaService {
	constructor(private readonly repository: EmpresaRepository) {}

	// Devuelve los datos de la empresa; la primera vez los crea con los valores del xlsm.
	async obtener(): Promise<Empresa> {
		const existente = await this.repository.obtener();

		if (existente) {
			return existente;
		}

		const ahora = ahoraIso();
		const inicial: Empresa = {
			id: EMPRESA_ID,
			...EMPRESA_INICIAL,
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: USUARIO_SISTEMA,
			deletedAt: null,
			version: 1,
		};
		await this.repository.guardar(inicial);

		return inicial;
	}

	async actualizar(datos: EmpresaDatos, usuario: string): Promise<Empresa> {
		const validos = EmpresaDatosSchema.parse(datos);
		const actual = await this.obtener();
		const actualizada: Empresa = {
			...actual,
			...validos,
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizada);

		return actualizada;
	}
}
