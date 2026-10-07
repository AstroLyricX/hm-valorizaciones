import type { HmDatabase } from "@/data/db";
import { agregarAlOutbox, agregarVariosAlOutbox, guardarConOutbox } from "@/data/outbox";

import {
	type Valorizacion,
	type ValorizacionItem,
	ValorizacionItemSchema,
	ValorizacionSchema,
} from "../domain/valorizacion";

export class ValorizacionRepository {
	constructor(private readonly database: HmDatabase) {}

	// Vigentes, de la más reciente a la más antigua.
	async listar(): Promise<Valorizacion[]> {
		const valorizaciones = await this.database.valorizaciones
			.orderBy("periodo")
			.reverse()
			.toArray();

		return valorizaciones.filter((valorizacion) => valorizacion.deletedAt === null);
	}

	// Incluye anuladas: sus números no se vuelven a usar.
	async todas(): Promise<Valorizacion[]> {
		return (await this.database.valorizaciones.toArray()).filter(
			(valorizacion) => valorizacion.deletedAt === null,
		);
	}

	async delContrato(contratoId: string): Promise<Valorizacion[]> {
		const valorizaciones = await this.database.valorizaciones
			.where("contratoId")
			.equals(contratoId)
			.toArray();

		return valorizaciones.filter((valorizacion) => valorizacion.deletedAt === null);
	}

	async obtener(id: string): Promise<Valorizacion | undefined> {
		return this.database.valorizaciones.get(id);
	}

	async items(valorizacionId: string): Promise<ValorizacionItem[]> {
		const items = await this.database.valorizacionItems
			.where("valorizacionId")
			.equals(valorizacionId)
			.toArray();

		return items.filter((item) => item.deletedAt === null);
	}

	async todosLosItems(): Promise<ValorizacionItem[]> {
		return (await this.database.valorizacionItems.toArray()).filter(
			(item) => item.deletedAt === null,
		);
	}

	async itemsDe(valorizacionIds: readonly string[]): Promise<ValorizacionItem[]> {
		const items = await this.database.valorizacionItems
			.where("valorizacionId")
			.anyOf([...valorizacionIds])
			.toArray();

		return items.filter((item) => item.deletedAt === null);
	}

	// Guarda la cabecera y sus ítems en una transacción, con sus entradas en el outbox.
	async guardar(
		valorizacion: Valorizacion,
		items: readonly ValorizacionItem[] = [],
	): Promise<void> {
		const cabecera = ValorizacionSchema.parse(valorizacion);
		const detalle = items.map((item) => ValorizacionItemSchema.parse(item));
		const { valorizaciones, valorizacionItems, outbox } = this.database;

		await this.database.transaction("rw", valorizaciones, valorizacionItems, outbox, async () => {
			await valorizaciones.put(cabecera);
			await agregarAlOutbox(this.database, "valorizaciones", cabecera);
			if (detalle.length > 0) {
				await valorizacionItems.bulkPut(detalle);
				await agregarVariosAlOutbox(this.database, "valorizacionItems", detalle);
			}
		});
	}

	async guardarItem(item: ValorizacionItem): Promise<void> {
		await guardarConOutbox(
			this.database,
			this.database.valorizacionItems,
			"valorizacionItems",
			ValorizacionItemSchema.parse(item),
		);
	}
}
