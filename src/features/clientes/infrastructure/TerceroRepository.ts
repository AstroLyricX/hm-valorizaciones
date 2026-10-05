import type { HmDatabase } from "@/data/db";
import { guardarConOutbox } from "@/data/outbox";

import { type Tercero, TerceroSchema } from "../domain/tercero";

export class TerceroRepository {
	constructor(private readonly database: HmDatabase) {}

	// Todos los registros no eliminados, ordenados por código.
	async listar(): Promise<Tercero[]> {
		const terceros = await this.database.terceros.orderBy("codigo").toArray();

		return terceros.filter((tercero) => tercero.deletedAt === null);
	}

	async obtener(id: string): Promise<Tercero | undefined> {
		return this.database.terceros.get(id);
	}

	async buscarPorRuc(ruc: string): Promise<Tercero | undefined> {
		return this.database.terceros.where("ruc").equals(ruc).first();
	}

	async codigos(): Promise<string[]> {
		return (await this.database.terceros.orderBy("codigo").keys()).map(String);
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
