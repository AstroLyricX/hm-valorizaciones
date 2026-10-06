import type { HmDatabase } from "@/data/db";
import { agregarAlOutbox, agregarVariosAlOutbox } from "@/data/outbox";

import {
	type Contrato,
	type ContratoEquipo,
	ContratoEquipoSchema,
	ContratoSchema,
} from "../domain/contrato";

export class ContratoRepository {
	constructor(private readonly database: HmDatabase) {}

	async listar(): Promise<Contrato[]> {
		const contratos = await this.database.contratos.orderBy("codigo").toArray();

		return contratos.filter((contrato) => contrato.deletedAt === null);
	}

	async obtener(id: string): Promise<Contrato | undefined> {
		return this.database.contratos.get(id);
	}

	// Equipos vigentes del contrato, en su orden.
	async equipos(contratoId: string): Promise<ContratoEquipo[]> {
		const equipos = await this.database.contratoEquipos
			.where("contratoId")
			.equals(contratoId)
			.toArray();

		return equipos.filter((equipo) => equipo.deletedAt === null).sort((a, b) => a.orden - b.orden);
	}

	async todosLosEquipos(): Promise<ContratoEquipo[]> {
		return (await this.database.contratoEquipos.toArray()).filter(
			(equipo) => equipo.deletedAt === null,
		);
	}

	async codigos(): Promise<string[]> {
		return (await this.database.contratos.orderBy("codigo").keys()).map(String);
	}

	// Guarda la cabecera y sus equipos (incluidos los quitados, con deletedAt) en una transacción.
	async guardar(contrato: Contrato, equipos: readonly ContratoEquipo[]): Promise<void> {
		const cabecera = ContratoSchema.parse(contrato);
		const detalle = equipos.map((equipo) => ContratoEquipoSchema.parse(equipo));
		const { contratos, contratoEquipos, outbox } = this.database;

		await this.database.transaction("rw", contratos, contratoEquipos, outbox, async () => {
			await contratos.put(cabecera);
			await agregarAlOutbox(this.database, "contratos", cabecera);
			await contratoEquipos.bulkPut(detalle);
			await agregarVariosAlOutbox(this.database, "contratoEquipos", detalle);
		});
	}
}
