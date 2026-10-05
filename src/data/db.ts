import Dexie, { type EntityTable } from "dexie";

import type { Tercero } from "@/features/clientes/domain/tercero";
import type { Empresa } from "@/features/configuracion/domain/empresa";

export type OperacionOutbox = "upsert" | "delete";

// Cambios pendientes de sincronizar con OneDrive (fase 12).
export interface OutboxEntry {
	id?: number;
	entidad: string;
	registroId: string;
	operacion: OperacionOutbox;
	payload: unknown;
	createdAt: string;
	intentos: number;
}

export class HmDatabase extends Dexie {
	empresa!: EntityTable<Empresa, "id">;
	terceros!: EntityTable<Tercero, "id">;
	outbox!: EntityTable<OutboxEntry, "id">;

	constructor(name = "hm-valorizaciones") {
		super(name);
		this.version(1).stores({
			empresa: "id",
			outbox: "++id, entidad, createdAt",
		});
		this.version(2).stores({
			terceros: "id, &ruc, codigo, estado, tipo",
		});
	}
}

export const db = new HmDatabase();
