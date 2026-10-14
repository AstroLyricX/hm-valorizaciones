import Dexie, { type EntityTable } from "dexie";

import type { Tercero } from "@/features/clientes/domain/tercero";
import type { Empresa } from "@/features/configuracion/domain/empresa";
import type { Contrato, ContratoEquipo } from "@/features/contratos/domain/contrato";
import type { Equipo } from "@/features/equipos/domain/equipo";
import type { Valorizacion, ValorizacionItem } from "@/features/valorizaciones/domain/valorizacion";

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

// Estado de la sincronización con SharePoint (fase 12).
export interface SyncMeta {
	clave: "driveId" | "deltaLink" | "ultimaSincronizacion";
	valor: string;
}

// eTag del archivo de cada registro en SharePoint, para escribir solo si nadie lo cambió.
export interface SyncArchivo {
	clave: string; // "terceros/<id>"
	eTag: string;
}

// PDFs emitidos que esperan subirse a SharePoint (también se generan sin conexión).
export interface ArchivoPendiente {
	id?: number;
	ruta: string;
	archivo: Blob;
	valorizacionId: string;
	createdAt: string;
}

// Consultas de RUC ya hechas: sirven sin conexión y ahorran consultas a la API (fase 13).
export interface RucConsultado {
	ruc: string;
	razonSocial: string;
	estado: string;
	condicion: string;
	direccion: string;
	consultadoEn: string;
}

export class HmDatabase extends Dexie {
	empresa!: EntityTable<Empresa, "id">;
	terceros!: EntityTable<Tercero, "id">;
	equipos!: EntityTable<Equipo, "id">;
	contratos!: EntityTable<Contrato, "id">;
	contratoEquipos!: EntityTable<ContratoEquipo, "id">;
	valorizaciones!: EntityTable<Valorizacion, "id">;
	valorizacionItems!: EntityTable<ValorizacionItem, "id">;
	outbox!: EntityTable<OutboxEntry, "id">;
	syncMeta!: EntityTable<SyncMeta, "clave">;
	syncArchivos!: EntityTable<SyncArchivo, "clave">;
	archivosPendientes!: EntityTable<ArchivoPendiente, "id">;
	rucConsultados!: EntityTable<RucConsultado, "ruc">;

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
		// Valorizaciones (fase 6): cabecera y horas del periodo por equipo del contrato.
		this.version(7).stores({
			valorizaciones: "id, contratoId, estado, periodo, numero",
			valorizacionItems: "id, valorizacionId, contratoEquipoId",
		});
		// Emisión (fase 7): totales congelados, monto en letras, anulación y copia de los datos
		// del contrato en cada ítem. Los borradores existentes quedan con esos campos vacíos.
		this.version(8).upgrade(async (tx) => {
			await tx
				.table("valorizaciones")
				.toCollection()
				.modify((valorizacion: Record<string, unknown>) => {
					valorizacion.totales ??= null;
					valorizacion.montoEnLetras ??= null;
					valorizacion.motivoAnulacion ??= null;
					valorizacion.anuladaEn ??= null;
				});
			await tx
				.table("valorizacionItems")
				.toCollection()
				.modify((item: Record<string, unknown>) => {
					item.descripcion ??= null;
					item.cantidadContractual ??= null;
					item.precioUnitario ??= null;
					item.cantidadAnterior ??= null;
				});
		});
		// Sincronización con SharePoint (fase 12) y ruta del PDF de cada valorización emitida.
		this.version(9)
			.stores({
				syncMeta: "clave",
				syncArchivos: "clave",
				archivosPendientes: "++id, valorizacionId",
			})
			.upgrade(async (tx) => {
				await tx
					.table("valorizaciones")
					.toCollection()
					.modify((valorizacion: Record<string, unknown>) => {
						valorizacion.pdfPath ??= null;
					});
			});
		// Caché local de las consultas de RUC (fase 13).
		this.version(10).stores({ rucConsultados: "ruc" });
		// Proveedores (lista aparte de los clientes, mismos datos): el RUC es único por lista.
		this.version(11)
			.stores({ terceros: "id, codigo, estado, tipo, ruc, [tipo+ruc]" })
			.upgrade(async (tx) => {
				await tx
					.table("terceros")
					.toCollection()
					.modify((tercero: Record<string, unknown>) => {
						tercero.tipo ??= "CLIENTE";
					});
			});
	}
}

export const db = new HmDatabase();
