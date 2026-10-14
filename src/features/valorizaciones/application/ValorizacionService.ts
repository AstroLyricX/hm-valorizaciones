import { uuidv7 } from "uuidv7";

import type { Rol } from "@/features/auth/SessionContext";
import type { Tercero } from "@/features/clientes/domain/tercero";
import type { TerceroRepository } from "@/features/clientes/infrastructure/TerceroRepository";
import type { EmpresaService } from "@/features/configuracion/application/EmpresaService";
import type { Empresa } from "@/features/configuracion/domain/empresa";
import { type Contrato, hoyIso } from "@/features/contratos/domain/contrato";
import type { ContratoRepository } from "@/features/contratos/infrastructure/ContratoRepository";
import { type Equipo, nombreEquipo } from "@/features/equipos/domain/equipo";
import type { EquipoRepository } from "@/features/equipos/infrastructure/EquipoRepository";
import { ahoraIso } from "@/lib/fechas";

import { montoEnLetras } from "../domain/montoEnLetras";
import {
	CABECERA_INICIAL,
	calcularValorizacion,
	CantidadSchema,
	MotivoAnulacionSchema,
	type NuevaValorizacion,
	NuevaValorizacionSchema,
	prefijoNumero,
	siguienteNumero,
	sumarCantidades,
	type Totales,
	type Valorizacion,
	type ValorizacionCabecera,
	ValorizacionCabeceraSchema,
	type ValorizacionCalculada,
	type ValorizacionItem,
	ValorizacionNoEditableError,
} from "../domain/valorizacion";
import type { ValorizacionRepository } from "../infrastructure/ValorizacionRepository";

// Una fila de la planilla. En un borrador sale del contrato vigente; en una emitida, de la
// copia guardada al emitir.
export interface FilaPlanilla {
	contratoEquipoId: string;
	equipo: Equipo | undefined;
	descripcion: string;
	cantidadContractual: string;
	precioUnitario: number;
	cantidadAnterior: string;
	cantidadActual: string;
}

export interface Planilla {
	valorizacion: Valorizacion;
	contrato: Contrato;
	proveedor: Tercero | undefined;
	empresa: Empresa;
	filas: FilaPlanilla[];
}

export class ContratoNoEncontradoError extends Error {
	constructor() {
		super("El contrato no existe.");
		this.name = "ContratoNoEncontradoError";
	}
}

export class SinPermisoError extends Error {
	constructor() {
		super("Solo un administrador puede anular una valorización.");
		this.name = "SinPermisoError";
	}
}

export class SinHorasError extends Error {
	constructor() {
		super("Ingresa las horas de al menos un equipo antes de emitir.");
		this.name = "SinHorasError";
	}
}

// Descripción del servicio como en la planilla del xlsm: "EXCAVADORA CAT 340 - ALQUILER".
export function descripcionServicio(equipo: Equipo | undefined): string {
	return equipo ? `${nombreEquipo(equipo)} - ALQUILER` : "EQUIPO NO ENCONTRADO";
}

export function calcularPlanilla(planilla: Planilla): ValorizacionCalculada {
	const { valorizacion, filas } = planilla;

	return calcularValorizacion(filas, {
		gastosGeneralesPct: valorizacion.gastosGeneralesPct,
		utilidadPct: valorizacion.utilidadPct,
		igvPct: valorizacion.igvPct,
		fondoGarantiaPct: valorizacion.fondoGarantiaPct,
	});
}

function totalesDe(calculo: ValorizacionCalculada): Totales {
	return {
		...calculo.actual,
		fondoGarantia: calculo.fondoGarantia,
		netoPagable: calculo.netoPagable,
	};
}

const SIN_EMITIR = {
	numero: null,
	fechaEmision: null,
	totales: null,
	montoEnLetras: null,
	motivoAnulacion: null,
	anuladaEn: null,
	pdfPath: null,
} as const;
const SIN_COPIA = {
	descripcion: null,
	cantidadContractual: null,
	precioUnitario: null,
	cantidadAnterior: null,
} as const;

export class ValorizacionService {
	constructor(
		private readonly repository: ValorizacionRepository,
		private readonly contratos: ContratoRepository,
		private readonly terceros: TerceroRepository,
		private readonly equipos: EquipoRepository,
		private readonly empresa: EmpresaService,
	) {}

	async listar(): Promise<Valorizacion[]> {
		return this.repository.listar();
	}

	// Crea el borrador del periodo con la cabecera del contrato y la configuración (P11).
	// Si ya hay un borrador del mismo contrato y periodo, lo devuelve para no duplicarlo.
	async crearBorrador(datos: NuevaValorizacion, usuario: string): Promise<Valorizacion> {
		const { contratoId, periodo } = NuevaValorizacionSchema.parse(datos);
		const contrato = await this.contratos.obtener(contratoId);

		if (!contrato || contrato.deletedAt !== null) {
			throw new ContratoNoEncontradoError();
		}
		const existente = (await this.repository.delContrato(contratoId)).find(
			(valorizacion) => valorizacion.periodo === periodo && valorizacion.estado === "BORRADOR",
		);
		if (existente) {
			return existente;
		}

		const [empresa, equiposDelContrato] = await Promise.all([
			this.empresa.obtener(),
			this.contratos.equipos(contratoId),
		]);
		const ahora = ahoraIso();
		const base = {
			createdAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			deletedAt: null,
			version: 1,
		};
		const valorizacion: Valorizacion = {
			id: uuidv7(),
			contratoId,
			periodo,
			...CABECERA_INICIAL,
			...SIN_EMITIR,
			estado: "BORRADOR",
			moneda: contrato.moneda,
			igvPct: empresa.igvPorcentaje,
			fondoGarantiaPct: contrato.fondoGarantiaPct,
			...base,
		};
		const items: ValorizacionItem[] = equiposDelContrato.map((contratoEquipo) => ({
			id: uuidv7(),
			valorizacionId: valorizacion.id,
			contratoEquipoId: contratoEquipo.id,
			cantidadActual: "0",
			...SIN_COPIA,
			...base,
		}));
		await this.repository.guardar(valorizacion, items);

		return valorizacion;
	}

	async obtenerPlanilla(id: string): Promise<Planilla | undefined> {
		const valorizacion = await this.repository.obtener(id);

		if (!valorizacion || valorizacion.deletedAt !== null) {
			return undefined;
		}
		const contrato = await this.contratos.obtener(valorizacion.contratoId);
		if (!contrato) {
			return undefined;
		}

		const [proveedor, empresa, equipos, items] = await Promise.all([
			this.terceros.obtener(contrato.terceroId),
			this.empresa.obtener(),
			this.equipos.listar(),
			this.repository.items(id),
		]);
		const porEquipo = new Map(equipos.map((equipo) => [equipo.id, equipo]));
		const filas =
			valorizacion.estado === "BORRADOR"
				? await this.filasDelBorrador(valorizacion, contrato, items, porEquipo)
				: await this.filasCongeladas(contrato, items, porEquipo);

		return { valorizacion, contrato, proveedor, empresa, filas };
	}

	// Guarda las horas del periodo de un equipo (se llama mientras el usuario escribe).
	async actualizarCantidad(
		id: string,
		contratoEquipoId: string,
		cantidad: string,
		usuario: string,
	): Promise<void> {
		const cantidadActual = CantidadSchema.parse(cantidad);
		await this.borrador(id);

		const existente = (await this.repository.items(id)).find(
			(item) => item.contratoEquipoId === contratoEquipoId,
		);
		const ahora = ahoraIso();
		await this.repository.guardarItem(
			existente
				? {
						...existente,
						cantidadActual,
						updatedAt: ahora,
						updatedBy: usuario,
						version: existente.version + 1,
					}
				: {
						id: uuidv7(),
						valorizacionId: id,
						contratoEquipoId,
						cantidadActual,
						...SIN_COPIA,
						createdAt: ahora,
						updatedAt: ahora,
						updatedBy: usuario,
						deletedAt: null,
						version: 1,
					},
		);
	}

	async actualizarCabecera(
		id: string,
		datos: ValorizacionCabecera,
		usuario: string,
	): Promise<Valorizacion> {
		const cabecera = ValorizacionCabeceraSchema.parse(datos);
		const actual = await this.borrador(id);
		const actualizada: Valorizacion = {
			...actual,
			...cabecera,
			updatedAt: ahoraIso(),
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(actualizada);

		return actualizada;
	}

	// Asigna el número correlativo del año (P7) y congela los datos del contrato, las horas
	// anteriores, el IGV y los totales. Desde aquí la valorización ya no se modifica.
	async emitir(id: string, usuario: string, fechaEmision = hoyIso()): Promise<Valorizacion> {
		const planilla = await this.obtenerPlanilla(id);
		if (!planilla || planilla.valorizacion.estado !== "BORRADOR") {
			throw new ValorizacionNoEditableError();
		}
		const { valorizacion, filas } = planilla;
		const calculo = calcularPlanilla(planilla);
		if (calculo.actual.subtotal1 === 0) {
			throw new SinHorasError();
		}

		const numeros = (await this.repository.todas()).map((otra) => otra.numero);
		const ahora = ahoraIso();
		const auditoria = { updatedAt: ahora, updatedBy: usuario };
		const existentes = new Map(
			(await this.repository.items(id)).map((item) => [item.contratoEquipoId, item]),
		);
		const items: ValorizacionItem[] = filas.map((fila) => {
			const existente = existentes.get(fila.contratoEquipoId);
			const copia = {
				descripcion: fila.descripcion,
				cantidadContractual: fila.cantidadContractual,
				precioUnitario: fila.precioUnitario,
				cantidadAnterior: fila.cantidadAnterior,
			};

			return existente
				? { ...existente, ...copia, ...auditoria, version: existente.version + 1 }
				: {
						id: uuidv7(),
						valorizacionId: id,
						contratoEquipoId: fila.contratoEquipoId,
						cantidadActual: fila.cantidadActual,
						...copia,
						...auditoria,
						createdAt: ahora,
						deletedAt: null,
						version: 1,
					};
		});
		const emitida: Valorizacion = {
			...valorizacion,
			estado: "EMITIDA",
			numero: siguienteNumero(
				Number(fechaEmision.slice(0, 4)),
				numeros,
				prefijoNumero(planilla.contrato.tipo),
			),
			fechaEmision,
			totales: totalesDe(calculo),
			montoEnLetras: montoEnLetras(calculo.actual.total, valorizacion.moneda),
			...auditoria,
			version: valorizacion.version + 1,
		};
		await this.repository.guardar(emitida, items);

		return emitida;
	}

	// Solo un administrador anula (D2). La anulada conserva su número y deja de sumar horas.
	async anular(id: string, motivo: string, usuario: string, rol: Rol): Promise<Valorizacion> {
		if (rol !== "ADMIN") {
			throw new SinPermisoError();
		}
		const motivoAnulacion = MotivoAnulacionSchema.parse(motivo);
		const actual = await this.repository.obtener(id);
		if (!actual || actual.deletedAt !== null || actual.estado !== "EMITIDA") {
			throw new Error("Solo se puede anular una valorización emitida.");
		}

		const ahora = ahoraIso();
		const anulada: Valorizacion = {
			...actual,
			estado: "ANULADA",
			motivoAnulacion,
			anuladaEn: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			version: actual.version + 1,
		};
		await this.repository.guardar(anulada);

		return anulada;
	}

	// Un borrador se puede descartar; las emitidas solo se anulan.
	async eliminarBorrador(id: string, usuario: string): Promise<void> {
		const actual = await this.borrador(id);
		const ahora = ahoraIso();
		await this.repository.guardar({
			...actual,
			deletedAt: ahora,
			updatedAt: ahora,
			updatedBy: usuario,
			version: actual.version + 1,
		});
	}

	private async borrador(id: string): Promise<Valorizacion> {
		const actual = await this.repository.obtener(id);

		if (!actual || actual.deletedAt !== null) {
			throw new Error(`No existe la valorización ${id}.`);
		}
		if (actual.estado !== "BORRADOR") {
			throw new ValorizacionNoEditableError();
		}

		return actual;
	}

	// Equipos vigentes del contrato. Uno agregado después de crear el borrador aparece con 0 horas.
	private async filasDelBorrador(
		valorizacion: Valorizacion,
		contrato: Contrato,
		items: readonly ValorizacionItem[],
		porEquipo: ReadonlyMap<string, Equipo>,
	): Promise<FilaPlanilla[]> {
		const [equiposDelContrato, anteriores] = await Promise.all([
			this.contratos.equipos(contrato.id),
			this.horasAnteriores(valorizacion),
		]);
		const actuales = new Map(items.map((item) => [item.contratoEquipoId, item.cantidadActual]));

		return equiposDelContrato.map((contratoEquipo) => {
			const equipo = porEquipo.get(contratoEquipo.equipoId);

			return {
				contratoEquipoId: contratoEquipo.id,
				equipo,
				descripcion: descripcionServicio(equipo),
				cantidadContractual: contratoEquipo.horasMinimas,
				precioUnitario: contratoEquipo.costoHora,
				cantidadAnterior: anteriores.get(contratoEquipo.id) ?? "0",
				cantidadActual: actuales.get(contratoEquipo.id) ?? "0",
			};
		});
	}

	// La copia guardada al emitir, en el orden del contrato.
	private async filasCongeladas(
		contrato: Contrato,
		items: readonly ValorizacionItem[],
		porEquipo: ReadonlyMap<string, Equipo>,
	): Promise<FilaPlanilla[]> {
		const equiposDelContrato = await this.contratos.todosLosEquiposDe(contrato.id);
		const porId = new Map(
			equiposDelContrato.map((contratoEquipo) => [contratoEquipo.id, contratoEquipo]),
		);
		const orden = (item: ValorizacionItem) => porId.get(item.contratoEquipoId)?.orden ?? 0;

		return [...items]
			.sort((a, b) => orden(a) - orden(b))
			.map((item) => {
				const equipoId = porId.get(item.contratoEquipoId)?.equipoId;

				return {
					contratoEquipoId: item.contratoEquipoId,
					equipo: equipoId === undefined ? undefined : porEquipo.get(equipoId),
					descripcion: item.descripcion ?? "",
					cantidadContractual: item.cantidadContractual ?? "0",
					precioUnitario: item.precioUnitario ?? 0,
					cantidadAnterior: item.cantidadAnterior ?? "0",
					cantidadActual: item.cantidadActual,
				};
			});
	}

	// Cantidad anterior (P5): suma de las horas de las valorizaciones EMITIDAS del contrato
	// de periodos anteriores, por equipo del contrato. Las anuladas no cuentan.
	private async horasAnteriores(valorizacion: Valorizacion): Promise<Map<string, string>> {
		const emitidas = (await this.repository.delContrato(valorizacion.contratoId)).filter(
			(otra) => otra.estado === "EMITIDA" && otra.periodo < valorizacion.periodo,
		);
		if (emitidas.length === 0) {
			return new Map();
		}

		const porEquipo = new Map<string, string[]>();
		for (const item of await this.repository.itemsDe(emitidas.map((otra) => otra.id))) {
			porEquipo.set(item.contratoEquipoId, [
				...(porEquipo.get(item.contratoEquipoId) ?? []),
				item.cantidadActual,
			]);
		}

		return new Map(
			[...porEquipo].map(([contratoEquipoId, cantidades]) => [
				contratoEquipoId,
				sumarCantidades(cantidades),
			]),
		);
	}
}

// Datos de facturación de cada parte, como en la hoja VALORIZACION.
export interface Parte {
	razonSocial: string;
	direccion: string;
	ruc: string;
	telefono: string;
}

// Contrato emitido: el cliente contrata a H&M (H&M es el proveedor y cobra).
// Contrato recibido: H&M contrata al proveedor (como el xlsm; H&M paga).
export function partesDe(planilla: Pick<Planilla, "contrato" | "proveedor" | "empresa">): {
	contratante: Parte;
	proveedor: Parte;
} {
	const { contrato, proveedor: tercero, empresa } = planilla;
	const hm: Parte = {
		razonSocial: empresa.razonSocial,
		direccion: empresa.direccion,
		ruc: empresa.ruc,
		telefono: empresa.telefono,
	};
	const contraparte: Parte = {
		razonSocial: tercero?.razonSocial ?? "",
		direccion: tercero?.direccion ?? "",
		ruc: tercero?.ruc ?? "",
		telefono: tercero?.representanteTelefono ?? "",
	};

	return contrato.tipo === "EMITIDO"
		? { contratante: contraparte, proveedor: hm }
		: { contratante: hm, proveedor: contraparte };
}
