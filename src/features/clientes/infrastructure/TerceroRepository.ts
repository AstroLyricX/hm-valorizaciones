import type { HmDatabase } from "@/data/db";
import { guardarConOutbox } from "@/data/outbox";

import { type Tercero, TerceroSchema, type TipoTercero } from "../domain/tercero";

export class TerceroRepository {
	constructor(private readonly database: HmDatabase) {}

	// Registros no eliminados, ordenados por código; solo los del tipo indicado si se pide.
	async listar(tipo?: TipoTercero): Promise<Tercero[]> {
		const terceros = await this.database.terceros.orderBy("codigo").toArray();

		return terceros.filter(
			(tercero) => tercero.deletedAt === null && (tipo === undefined || tercero.tipo === tipo),
		);
	}

	async obtener(id: string): Promise<Tercero | undefined> {
		return this.database.terceros.get(id);
	}

	// El RUC es único dentro de cada lista: una empresa puede ser cliente y también proveedor.
	async buscarPorRuc(ruc: string, tipo: TipoTercero): Promise<Tercero | undefined> {
		return this.database.terceros.where("[tipo+ruc]").equals([tipo, ruc]).first();
	}

	async codigos(tipo: TipoTercero): Promise<string[]> {
		return (await this.database.terceros.where("tipo").equals(tipo).toArray()).map(
			(tercero) => tercero.codigo,
		);
	}

	async guardar(tercero: Tercero): Promise<void> {
		await guardarConOutbox(
			this.database,
			this.database.terceros,
			"terceros",
			TerceroSchema.parse(tercero),
		);
	}
}
