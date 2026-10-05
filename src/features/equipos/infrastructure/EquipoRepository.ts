import type { HmDatabase } from "@/data/db";
import { guardarConOutbox } from "@/data/outbox";

import { type Equipo, EquipoSchema } from "../domain/equipo";

export class EquipoRepository {
	constructor(private readonly database: HmDatabase) {}

	async listar(): Promise<Equipo[]> {
		const equipos = await this.database.equipos.orderBy("codigo").toArray();

		return equipos.filter((equipo) => equipo.deletedAt === null);
	}

	async obtener(id: string): Promise<Equipo | undefined> {
		return this.database.equipos.get(id);
	}

	async codigos(): Promise<string[]> {
		return (await this.database.equipos.orderBy("codigo").keys()).map(String);
	}

	async guardar(equipo: Equipo): Promise<void> {
		await guardarConOutbox(
			this.database,
			this.database.equipos,
			"equipos",
			EquipoSchema.parse(equipo),
		);
	}
}
