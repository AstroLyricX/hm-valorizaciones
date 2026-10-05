import type { EntityTable } from "dexie";

import { ahoraIso } from "@/lib/fechas";

import type { HmDatabase } from "./db";

// Guarda un registro y deja el cambio en el outbox en la misma transacción,
// para que la sincronización (fase 12) nunca pierda un cambio.
export async function guardarConOutbox<T extends { id: string }>(
	database: HmDatabase,
	table: EntityTable<T, "id">,
	entidad: string,
	registro: T,
): Promise<void> {
	await database.transaction("rw", table, database.outbox, async () => {
		await table.put(registro);
		await database.outbox.add({
			entidad,
			registroId: registro.id,
			operacion: "upsert",
			payload: registro,
			createdAt: ahoraIso(),
			intentos: 0,
		});
	});
}
