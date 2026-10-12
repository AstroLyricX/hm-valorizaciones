/* eslint-disable no-await-in-loop -- los registros se suben y aplican de uno en uno, en orden:
   así un fallo de red detiene la sincronización sin perder ni duplicar cambios. */
import type { EntityTable } from "dexie";
import type { z } from "zod";

import { TerceroSchema } from "@/features/clientes/domain/tercero";
import { EmpresaSchema } from "@/features/configuracion/domain/empresa";
import { ContratoEquipoSchema, ContratoSchema } from "@/features/contratos/domain/contrato";
import { EquipoSchema } from "@/features/equipos/domain/equipo";
import {
	ValorizacionItemSchema,
	ValorizacionSchema,
} from "@/features/valorizaciones/domain/valorizacion";
import { ahoraIso } from "@/lib/fechas";

import type { HmDatabase, OutboxEntry } from "../db";
import { agregarAlOutbox } from "../outbox";
import {
	ConflictoError,
	type ElementoDrive,
	type GraphClient,
	SinConexionError,
} from "./graphClient";

// Carpeta de la empresa en SharePoint: SistemaHM/{tabla}/{id}.json y SistemaHM/pdf/{año}/.
export const CARPETA = "SistemaHM";

interface Registro {
	id: string;
	updatedAt: string;
}

// Tablas que se sincronizan, con el esquema que valida lo que llega de otros dispositivos.
const TABLAS = {
	empresa: EmpresaSchema,
	terceros: TerceroSchema,
	equipos: EquipoSchema,
	contratos: ContratoSchema,
	contratoEquipos: ContratoEquipoSchema,
	valorizaciones: ValorizacionSchema,
	valorizacionItems: ValorizacionItemSchema,
} satisfies Record<string, z.ZodType>;

export type TablaSincronizada = keyof typeof TABLAS;

export interface Conflicto {
	tabla: TablaSincronizada;
	id: string;
	// Gana el cambio más reciente (updatedAt).
	ganador: "local" | "remoto";
}

export interface ResultadoSync {
	subidos: number;
	bajados: number;
	archivos: number;
	conflictos: Conflicto[];
	avisos: string[];
}

export type GraphParaSync = Pick<
	GraphClient,
	"driveDelSitio" | "escribirJson" | "leerJson" | "delta" | "contenido" | "subirArchivo"
>;

function esTabla(nombre: string): nombre is TablaSincronizada {
	return Object.hasOwn(TABLAS, nombre);
}

function rutaRegistro(tabla: TablaSincronizada, id: string): string {
	return `${CARPETA}/${tabla}/${id}.json`;
}

// Motor de sincronización: Dexie es la fuente de verdad en el dispositivo; SharePoint, el punto
// de encuentro entre dispositivos. Primero baja lo nuevo (/delta), luego sube los PDFs y lo
// pendiente del outbox. Si se corta la red, lo que falta queda para la próxima vez.
export class SyncEngine {
	private enCurso: Promise<ResultadoSync> | null = null;

	constructor(
		private readonly database: HmDatabase,
		private readonly graph: GraphParaSync,
		private readonly sitio: string,
	) {}

	// Varias llamadas seguidas comparten la misma sincronización.
	async sincronizar(): Promise<ResultadoSync> {
		this.enCurso ??= this.ejecutar().finally(() => {
			this.enCurso = null;
		});

		return this.enCurso;
	}

	private async ejecutar(): Promise<ResultadoSync> {
		const resultado: ResultadoSync = {
			subidos: 0,
			bajados: 0,
			archivos: 0,
			conflictos: [],
			avisos: [],
		};
		const driveId = await this.drive();

		await this.bajar(driveId, resultado);
		await this.subirArchivos(driveId, resultado);
		await this.subir(driveId, resultado);
		await this.revisarNumeros(resultado);
		await this.database.syncMeta.put({ clave: "ultimaSincronizacion", valor: ahoraIso() });

		return resultado;
	}

	private async drive(): Promise<string> {
		const guardado = await this.database.syncMeta.get("driveId");
		if (guardado) {
			return guardado.valor;
		}
		const driveId = await this.graph.driveDelSitio(this.sitio);
		await this.database.syncMeta.put({ clave: "driveId", valor: driveId });

		return driveId;
	}

	private tabla(nombre: TablaSincronizada): EntityTable<Registro, "id"> {
		return this.database.table(nombre) as unknown as EntityTable<Registro, "id">;
	}

	private async pendientesDe(tabla: TablaSincronizada, id: string): Promise<OutboxEntry[]> {
		return (await this.database.outbox.where("entidad").equals(tabla).toArray()).filter(
			(entrada) => entrada.registroId === id,
		);
	}

	// Escribe un registro llegado de otro dispositivo, sin pasar por el outbox.
	private async aplicarRemoto(
		tabla: TablaSincronizada,
		registro: Registro,
		resultado: ResultadoSync,
	): Promise<boolean> {
		try {
			await this.tabla(tabla).put(registro);

			return true;
		} catch (error) {
			// Por ejemplo, dos clientes con el mismo RUC creados sin conexión en dos dispositivos.
			resultado.avisos.push(
				`No se pudo guardar un registro de ${tabla} llegado de otro dispositivo: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);

			return false;
		}
	}

	private async bajar(driveId: string, resultado: ResultadoSync): Promise<void> {
		const deltaLink = (await this.database.syncMeta.get("deltaLink"))?.valor;
		const { elementos, deltaLink: siguiente } = await this.graph.delta(driveId, deltaLink);

		for (const elemento of elementos) {
			await this.bajarElemento(driveId, elemento, resultado);
		}
		await this.database.syncMeta.put({ clave: "deltaLink", valor: siguiente });
	}

	private async bajarElemento(
		driveId: string,
		elemento: ElementoDrive,
		resultado: ResultadoSync,
	): Promise<void> {
		// Los registros nunca se borran (borrado lógico con deletedAt): un archivo borrado se ignora.
		if (
			elemento.deleted !== undefined ||
			elemento.file === undefined ||
			!elemento.name.endsWith(".json")
		) {
			return;
		}
		// Solo los archivos de SistemaHM/{tabla}/ (el delta trae todo el sitio).
		const carpeta = elemento.parentReference?.path?.split("root:/").at(1) ?? "";
		const [raiz, tabla = "", ...resto] = carpeta.split("/");
		if (raiz !== CARPETA || resto.length > 0 || !esTabla(tabla)) {
			return;
		}
		const id = elemento.name.slice(0, -".json".length);
		const clave = `${tabla}/${id}`;
		// Es el archivo que subió este mismo dispositivo.
		if ((await this.database.syncArchivos.get(clave))?.eTag === elemento.eTag) {
			return;
		}

		const contenido = await this.graph.contenido<unknown>(driveId, elemento.id);
		const validado = TABLAS[tabla].safeParse(contenido);
		if (!validado.success) {
			resultado.avisos.push(`Se ignoró ${clave}: los datos no tienen el formato esperado.`);

			return;
		}
		const remoto = validado.data as Registro;
		const local = await this.tabla(tabla).get(id);
		const pendientes = await this.pendientesDe(tabla, id);

		if (!local || remoto.updatedAt > local.updatedAt) {
			if (await this.aplicarRemoto(tabla, remoto, resultado)) {
				resultado.bajados++;
				if (pendientes.length > 0) {
					// El cambio de este dispositivo era más antiguo: se descarta.
					await this.database.outbox.bulkDelete(pendientes.map((entrada) => entrada.id ?? 0));
					resultado.conflictos.push({ tabla, id, ganador: "remoto" });
				}
			}
		} else if (pendientes.length > 0 && remoto.updatedAt < local.updatedAt) {
			// El de este dispositivo es más reciente: se subirá encima del remoto.
			resultado.conflictos.push({ tabla, id, ganador: "local" });
		}
		if (elemento.eTag) {
			await this.database.syncArchivos.put({ clave, eTag: elemento.eTag });
		}
	}

	private async subir(driveId: string, resultado: ResultadoSync): Promise<void> {
		const entradas = await this.database.outbox.orderBy("id").toArray();
		// Varias ediciones del mismo registro se suben una sola vez, con su estado actual.
		const porRegistro = new Map<string, OutboxEntry[]>();
		for (const entrada of entradas) {
			const clave = `${entrada.entidad}/${entrada.registroId}`;
			porRegistro.set(clave, [...(porRegistro.get(clave) ?? []), entrada]);
		}

		for (const [clave, grupo] of porRegistro) {
			const tabla = grupo[0].entidad;
			const ids = grupo.map((entrada) => entrada.id ?? 0);
			if (!esTabla(tabla)) {
				await this.database.outbox.bulkDelete(ids);
				continue;
			}
			const registro =
				(await this.tabla(tabla).get(grupo[0].registroId)) ?? (grupo.at(-1)?.payload as Registro);
			try {
				await this.subirRegistro(driveId, tabla, registro, resultado);
				await this.database.outbox.bulkDelete(ids);
				resultado.subidos++;
			} catch (error) {
				if (error instanceof SinConexionError) {
					throw error;
				}
				await this.database.outbox.bulkUpdate(
					grupo.map((entrada) => ({
						key: entrada.id ?? 0,
						changes: { intentos: entrada.intentos + 1 },
					})),
				);
				resultado.avisos.push(
					`No se pudo subir ${clave}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	private async subirRegistro(
		driveId: string,
		tabla: TablaSincronizada,
		registro: Registro,
		resultado: ResultadoSync,
	): Promise<void> {
		const clave = `${tabla}/${registro.id}`;
		const ruta = rutaRegistro(tabla, registro.id);
		const conocido = await this.database.syncArchivos.get(clave);

		try {
			const elemento = await this.graph.escribirJson(
				driveId,
				ruta,
				registro,
				conocido ? { eTag: conocido.eTag } : "nuevo",
			);
			await this.guardarETag(clave, elemento);
		} catch (error) {
			if (!(error instanceof ConflictoError)) {
				throw error;
			}
			// Otro dispositivo lo cambió: gana el más reciente.
			const { contenido, elemento } = await this.graph.leerJson<Registro>(driveId, ruta);
			if (contenido.updatedAt > registro.updatedAt) {
				await this.aplicarRemoto(tabla, contenido, resultado);
				await this.guardarETag(clave, elemento);
				resultado.conflictos.push({ tabla, id: registro.id, ganador: "remoto" });

				return;
			}
			const sobrescrito = await this.graph.escribirJson(driveId, ruta, registro, {
				eTag: elemento.eTag ?? "",
			});
			await this.guardarETag(clave, sobrescrito);
			resultado.conflictos.push({ tabla, id: registro.id, ganador: "local" });
		}
	}

	private async guardarETag(clave: string, elemento: ElementoDrive): Promise<void> {
		if (elemento.eTag) {
			await this.database.syncArchivos.put({ clave, eTag: elemento.eTag });
		}
	}

	// PDFs emitidos: se suben y su ruta queda en la valorización (P9), que se sincroniza después.
	private async subirArchivos(driveId: string, resultado: ResultadoSync): Promise<void> {
		for (const pendiente of await this.database.archivosPendientes.toArray()) {
			await this.graph.subirArchivo(driveId, pendiente.ruta, pendiente.archivo);
			await this.database.transaction(
				"rw",
				this.database.valorizaciones,
				this.database.archivosPendientes,
				this.database.outbox,
				async () => {
					const valorizacion = await this.database.valorizaciones.get(pendiente.valorizacionId);
					if (valorizacion) {
						const actualizada = {
							...valorizacion,
							pdfPath: pendiente.ruta,
							updatedAt: ahoraIso(),
							version: valorizacion.version + 1,
						};
						await this.database.valorizaciones.put(actualizada);
						await agregarAlOutbox(this.database, "valorizaciones", actualizada);
					}
					await this.database.archivosPendientes.delete(pendiente.id ?? 0);
				},
			);
			resultado.archivos++;
		}
	}

	// Dos dispositivos sin conexión pueden emitir el mismo número: se avisa para anular una.
	private async revisarNumeros(resultado: ResultadoSync): Promise<void> {
		const porNumero = new Map<string, number>();
		for (const valorizacion of await this.database.valorizaciones.toArray()) {
			if (
				valorizacion.deletedAt === null &&
				valorizacion.estado === "EMITIDA" &&
				valorizacion.numero
			) {
				porNumero.set(valorizacion.numero, (porNumero.get(valorizacion.numero) ?? 0) + 1);
			}
		}
		for (const [numero, cantidad] of porNumero) {
			if (cantidad > 1) {
				resultado.avisos.push(
					`Hay ${cantidad} valorizaciones emitidas con el número ${numero}. Anula la que sobra y vuelve a emitirla.`,
				);
			}
		}
	}
}

export function rutaPdf(nombreArchivo: string, fechaEmision: string): string {
	return `${CARPETA}/pdf/${fechaEmision.slice(0, 4)}/${nombreArchivo}`;
}
