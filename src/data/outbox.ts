import type { EntityTable } from "dexie";

import { ahoraIso } from "@/lib/fechas";

import type { HmDatabase } from "./db";

// Deja un cambio pendiente de sincronizar (fase 12). Debe llamarse dentro de una transacción
// que incluya la tabla outbox, junto con la escritura del registro.
export async function agregarAlOutbox(
	database: HmDatabase,
	entidad: string,
	registro: { id: string },
): Promise<void> {
	await database.outbox.add({
		entidad,
		registroId: registro.id,
		operacion: "upsert",
		payload: registro,
		createdAt: ahoraIso(),
		intentos: 0,
	});
}

export async function agregarVariosAlOutbox(
	database: HmDatabase,
	entidad: string,
	registros: readonly { id: string }[],
): Promise<void> {
	const createdAt = ahoraIso();
	await database.outbox.bulkAdd(
		registros.map((registro) => ({
			entidad,
			registroId: registro.id,
			operacion: "upsert" as const,
			payload: registro,
			createdAt,
			intentos: 0,
		})),
	);
}

// Guarda un registro y su entrada en el outbox en la misma transacción,
// para que la sincronización nunca pierda un cambio.
export async function guardarConOutbox<T extends { id: string }>(
	database: HmDatabase,
	table: EntityTable<T, "id">,
	entidad: string,
	registro: T,
): Promise<void> {
	await database.transaction("rw", table, database.outbox, async () => {
		await table.put(registro);
		await agregarAlOutbox(database, entidad, registro);
	});
}
