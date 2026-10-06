import Dexie, { type EntityTable } from "dexie";

import type { Tercero } from "@/features/clientes/domain/tercero";
import type { Empresa } from "@/features/configuracion/domain/empresa";
import type { Contrato, ContratoEquipo } from "@/features/contratos/domain/contrato";
import type { Equipo } from "@/features/equipos/domain/equipo";

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
	equipos!: EntityTable<Equipo, "id">;
	contratos!: EntityTable<Contrato, "id">;
	contratoEquipos!: EntityTable<ContratoEquipo, "id">;
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
		this.version(3).stores({
			equipos: "id, codigo, estado, tipo",
		});
		this.version(4).stores({
			contratos: "id, codigo, terceroId, estado",
			contratoItems: "id, contratoId, equipoId",
		});
		// El contrato pasa a tener equipos con horas mínimas y costo por hora (VALORIZACIONES.txt).
		this.version(5)
			.stores({
				contratos: "id, codigo, terceroId",
				contratoItems: null,
				contratoEquipos: "id, contratoId, equipoId",
			})
			.upgrade(async (tx) => {
				// Solo había contratos de prueba (sin valorizaciones): se descartan los del formato anterior.
				await tx.table("contratos").clear();
			});
		// Clientes con representante y datos bancarios; equipos con activo fijo, motor y dueño.
		this.version(6)
			.stores({
				terceros: "id, &ruc, codigo, estado",
				equipos: "id, activoFijo, placa, estado, duenoId",
			})
			.upgrade(async (tx) => {
				// Solo había datos de prueba con los campos anteriores: se descartan.
				await Promise.all(
					["terceros", "equipos", "contratos", "contratoEquipos"].map(async (tabla) =>
						tx.table(tabla).clear(),
					),
				);
			});
	}
}

export const db = new HmDatabase();
