import Big from "big.js";
import { z } from "zod";

import { BaseSchema } from "@/data/base";
import { MONEDAS } from "@/features/contratos/domain/contrato";
import { aCentavos, formatearMoneda } from "@/lib/dinero";

// Valorización según la hoja VALORIZACION del xlsm y VALORIZACIONES.txt: por cada equipo del
// contrato se ingresan las horas del periodo; lo anterior, lo acumulado y los importes se calculan.
export const ESTADOS_VALORIZACION = ["BORRADOR", "EMITIDA", "ANULADA"] as const;

export type EstadoValorizacion = (typeof ESTADOS_VALORIZACION)[number];

export const ETIQUETA_ESTADO_VALORIZACION: Record<EstadoValorizacion, string> = {
	BORRADOR: "Borrador",
	EMITIDA: "Emitida",
	ANULADA: "Anulada",
};

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const CANTIDAD = /^\d{1,7}(\.\d{1,2})?$/;

const porcentaje = (mensaje: string) =>
	z
		.number({ error: mensaje })
		.min(0, "El porcentaje no puede ser negativo.")
		.max(100, "El porcentaje no puede superar 100 %.")
		.multipleOf(0.01, "Máximo 2 decimales.");

export const CantidadSchema = z
	.string()
	.trim()
	.regex(CANTIDAD, "Ingresa las horas, por ejemplo 53.23.");

// Datos de la cabecera que el usuario puede cambiar mientras es borrador.
export const ValorizacionCabeceraSchema = z.object({
	nombreServicio: z
		.string()
		.trim()
		.min(3, "Ingresa el nombre del servicio.")
		.max(120, "Máximo 120 caracteres.")
		.transform((valor) => valor.toUpperCase()),
	plazoPago: z.string().trim().max(40, "Máximo 40 caracteres."),
	gastosGeneralesPct: porcentaje("Ingresa los gastos generales, por ejemplo 0."),
	utilidadPct: porcentaje("Ingresa la utilidad, por ejemplo 0."),
	observaciones: z.string().trim().max(500, "Máximo 500 caracteres."),
});

export const NuevaValorizacionSchema = z.object({
	contratoId: z.string().min(1, "Selecciona el contrato."),
	periodo: z.string().regex(PERIODO, "Selecciona el periodo."),
});

// Ítems que se agregan en la misma valorización, fuera de los equipos del contrato (por ejemplo,
// viajes de transporte). Se cobran solo en su periodo: no tienen cantidad contractual.
export const UNIDADES_MEDIDA = ["HORAS", "VIAJES", "UNIDADES"] as const;

export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

export const ETIQUETA_UNIDAD: Record<UnidadMedida, string> = {
	HORAS: "Horas",
	VIAJES: "Viajes",
	UNIDADES: "Unidades",
};

// Columna UM de la planilla y del PDF.
export const ABREVIATURA_UNIDAD: Record<UnidadMedida, string> = {
	HORAS: "H",
	VIAJES: "VJE",
	UNIDADES: "UND",
};

export const MAX_ADICIONALES = 20;
const MONTO = /^\d{1,9}(\.\d{1,2})?$/;

// Se guarda tal como se escribe (el borrador se guarda solo); se valida completo al emitir.
export const ItemAdicionalSchema = z.object({
	id: z.string().min(1).max(64),
	descripcion: z.string().max(120),
	unidad: z.enum(UNIDADES_MEDIDA),
	cantidad: z.string().max(12),
	// Precio unitario como texto decimal: "47.00".
	precioUnitario: z.string().max(15),
});

// Zod 4 ejecuta todas las validaciones aunque falle el formato: se comprueba el formato antes de
// usar big.js para no lanzar con textos incompletos.
export const ItemAdicionalCompletoSchema = ItemAdicionalSchema.extend({
	descripcion: z.string().trim().min(3, "Ingresa la descripción.").max(120),
	cantidad: z
		.string()
		.trim()
		.regex(CANTIDAD, "Ingresa la cantidad, por ejemplo 2.")
		.refine(
			(valor) => !CANTIDAD.test(valor) || new Big(valor).gt(0),
			"La cantidad debe ser mayor a 0.",
		),
	precioUnitario: z
		.string()
		.trim()
		.regex(MONTO, "Ingresa el precio, por ejemplo 350.00.")
		.refine((valor) => !MONTO.test(valor) || new Big(valor).gt(0), "El precio debe ser mayor a 0."),
});

export type ItemAdicional = z.infer<typeof ItemAdicionalSchema>;

export function adicionalVacio(item: ItemAdicional): boolean {
	return (
		item.descripcion.trim() === "" &&
		["", "0"].includes(item.cantidad.trim()) &&
		["", "0"].includes(item.precioUnitario.trim())
	);
}

// Precio en centavos; uno inválido (aún se escribe) cuenta como 0.
export function precioAdicional(item: Pick<ItemAdicional, "precioUnitario">): number {
	const valor = item.precioUnitario.trim();

	return MONTO.test(valor) ? aCentavos(valor) : 0;
}

const centavos = z.int();

export const TotalesSchema = z.object({
	subtotal1: centavos,
	gastosGenerales: centavos,
	utilidad: centavos,
	subtotal2: centavos,
	igv: centavos,
	total: centavos,
	fondoGarantia: centavos,
	netoPagable: centavos,
	// Parte del subtotal 1 que corresponde a ítems adicionales (no suma al avance del contrato).
	adicionales: centavos.default(0),
});

export type Totales = z.infer<typeof TotalesSchema>;

export const ValorizacionSchema = BaseSchema.extend({
	...ValorizacionCabeceraSchema.shape,
	...NuevaValorizacionSchema.shape,
	// Se asigna al emitir (fase 7): correlativo de 4 dígitos por año, "0002-2026".
	numero: z.string().nullable(),
	fechaEmision: z.iso.date().nullable(),
	estado: z.enum(ESTADOS_VALORIZACION),
	moneda: z.enum(MONEDAS),
	// Se copian al crear el borrador: el IGV de Configuración y el fondo de garantía del contrato.
	igvPct: z.number().min(0).max(100),
	fondoGarantiaPct: z.number().min(0).max(100),
	// Se congelan al emitir: los montos del periodo y el total en letras.
	totales: TotalesSchema.nullable(),
	montoEnLetras: z.string().nullable(),
	// Solo en las anuladas.
	motivoAnulacion: z.string().nullable(),
	anuladaEn: z.iso.datetime().nullable(),
	// Ruta del PDF emitido en SharePoint (P9), cuando ya se subió.
	pdfPath: z.string().nullable(),
	adicionales: z.array(ItemAdicionalSchema).max(MAX_ADICIONALES).default([]),
});

// Horas del periodo por equipo del contrato. Al emitir se copian los datos del contrato y
// las horas anteriores, para que la valorización emitida no cambie si se edita el contrato.
export const ValorizacionItemSchema = BaseSchema.extend({
	valorizacionId: z.string().min(1),
	contratoEquipoId: z.string().min(1),
	cantidadActual: CantidadSchema,
	descripcion: z.string().nullable(),
	cantidadContractual: z.string().nullable(),
	precioUnitario: z.int().nullable(),
	cantidadAnterior: z.string().nullable(),
});

export const MotivoAnulacionSchema = z
	.string()
	.trim()
	.min(5, "Escribe el motivo de la anulación.")
	.max(300, "Máximo 300 caracteres.");

export type ValorizacionCabecera = z.infer<typeof ValorizacionCabeceraSchema>;
export type NuevaValorizacion = z.infer<typeof NuevaValorizacionSchema>;
export type Valorizacion = z.infer<typeof ValorizacionSchema>;
export type ValorizacionItem = z.infer<typeof ValorizacionItemSchema>;

export const CABECERA_INICIAL: ValorizacionCabecera = {
	nombreServicio: "ALQUILER DE EQUIPO PESADO",
	plazoPago: "30 DÍAS",
	gastosGeneralesPct: 0,
	utilidadPct: 0,
	observaciones: "",
};

// ---------- Cálculo ----------

export interface ItemACalcular {
	// Horas contratadas y precio por hora (centavos).
	cantidadContractual: string;
	precioUnitario: number;
	// Horas de las valorizaciones emitidas antes y horas de este periodo.
	cantidadAnterior: string;
	cantidadActual: string;
}

export interface ItemCalculado {
	parcial: number;
	cantidadAcumulada: string;
	importeAnterior: number;
	importeActual: number;
	importeAcumulado: number;
	// Horas por encima de lo contratado ("0" si no excede).
	exceso: string;
}

export interface ColumnaResumen {
	subtotal1: number;
	gastosGenerales: number;
	utilidad: number;
	subtotal2: number;
	igv: number;
	total: number;
}

export interface ValorizacionCalculada {
	items: ItemCalculado[];
	// Importe de cada ítem adicional del periodo y su suma.
	adicionales: number[];
	totalAdicionales: number;
	contractual: ColumnaResumen;
	anterior: ColumnaResumen;
	actual: ColumnaResumen;
	acumulado: ColumnaResumen;
	// Retención del periodo y lo que se paga.
	fondoGarantia: number;
	netoPagable: number;
	// Monto contractual menos lo acumulado (sin impuestos), puede ser negativo si se excede.
	saldoContractual: number;
	// Acumulado sobre el monto contractual, en %, con 2 decimales.
	avancePct: number;
	excede: boolean;
}

export interface ParametrosCalculo {
	gastosGeneralesPct: number;
	utilidadPct: number;
	igvPct: number;
	fondoGarantiaPct: number;
}

function redondear(valor: Big): number {
	return valor.round(0, Big.roundHalfUp).toNumber();
}

function porcentajeDe(centavos: number, pct: number): number {
	return redondear(new Big(centavos).times(pct).div(100));
}

function cantidadValida(valor: string): Big {
	return CANTIDAD.test(valor.trim()) ? new Big(valor.trim()) : new Big(0);
}

function importe(cantidad: Big, precioUnitario: number): number {
	return redondear(cantidad.times(precioUnitario));
}

function columna(subtotal1: number, parametros: ParametrosCalculo): ColumnaResumen {
	const gastosGenerales = porcentajeDe(subtotal1, parametros.gastosGeneralesPct);
	const utilidad = porcentajeDe(subtotal1, parametros.utilidadPct);
	const subtotal2 = subtotal1 + gastosGenerales + utilidad;
	const igv = porcentajeDe(subtotal2, parametros.igvPct);

	return { subtotal1, gastosGenerales, utilidad, subtotal2, igv, total: subtotal2 + igv };
}

// Cálculo de la planilla de medición y del resumen. Montos en centavos; horas como texto
// decimal. Una cantidad inválida (el usuario aún escribe) cuenta como 0.
export function calcularValorizacion(
	items: readonly ItemACalcular[],
	parametros: ParametrosCalculo,
	extras: {
		adicionales?: readonly Pick<ItemAdicional, "cantidad" | "precioUnitario">[];
		// Suma de los adicionales de las valorizaciones emitidas antes (columna Anterior).
		adicionalesAnteriores?: number;
	} = {},
): ValorizacionCalculada {
	const calculados = items.map((item): ItemCalculado => {
		const contractual = cantidadValida(item.cantidadContractual);
		const anterior = cantidadValida(item.cantidadAnterior);
		const actual = cantidadValida(item.cantidadActual);
		const acumulada = anterior.plus(actual);
		const importeAnterior = importe(anterior, item.precioUnitario);
		const importeActual = importe(actual, item.precioUnitario);

		return {
			parcial: importe(contractual, item.precioUnitario),
			cantidadAcumulada: acumulada.toString(),
			importeAnterior,
			importeActual,
			importeAcumulado: importeAnterior + importeActual,
			exceso: acumulada.gt(contractual) ? acumulada.minus(contractual).toString() : "0",
		};
	});

	const suma = (campo: "parcial" | "importeAnterior" | "importeActual" | "importeAcumulado") =>
		calculados.reduce((total, item) => total + item[campo], 0);
	const adicionales = (extras.adicionales ?? []).map((item) =>
		importe(cantidadValida(item.cantidad), precioAdicional(item)),
	);
	const totalAdicionales = adicionales.reduce((total, monto) => total + monto, 0);
	const anteriores = extras.adicionalesAnteriores ?? 0;
	// El avance y el saldo son solo del contrato: los adicionales quedan fuera.
	const acumuladoContrato = suma("importeAcumulado");
	const contractual = columna(suma("parcial"), parametros);
	const actual = columna(suma("importeActual") + totalAdicionales, parametros);
	const acumulado = columna(acumuladoContrato + anteriores + totalAdicionales, parametros);
	const fondoGarantia = porcentajeDe(actual.subtotal2, parametros.fondoGarantiaPct);

	return {
		items: calculados,
		adicionales,
		totalAdicionales,
		contractual,
		anterior: columna(suma("importeAnterior") + anteriores, parametros),
		actual,
		acumulado,
		fondoGarantia,
		netoPagable: actual.total - fondoGarantia,
		saldoContractual: contractual.subtotal1 - acumuladoContrato,
		avancePct:
			contractual.subtotal1 === 0
				? 0
				: new Big(acumuladoContrato)
						.times(100)
						.div(contractual.subtotal1)
						.round(2, Big.roundHalfUp)
						.toNumber(),
		excede: calculados.some((item) => item.exceso !== "0"),
	};
}

// Suma de horas como texto decimal (para la cantidad anterior).
export function sumarCantidades(cantidades: readonly string[]): string {
	return cantidades
		.reduce((total, cantidad) => total.plus(cantidadValida(cantidad)), new Big(0))
		.toString();
}

const MESES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
] as const;

export function nombreMes(mes: number): string {
	return MESES[mes - 1];
}

// "2026-08" → "Agosto 2026".
// Lleva el periodo "YYYY-MM" al rango [desde, hasta] si se sale de él.
export function ajustarPeriodo(periodo: string, desde?: string, hasta?: string): string {
	if (desde !== undefined && periodo < desde) {
		return desde;
	}

	return hasta !== undefined && periodo > hasta ? hasta : periodo;
}

export function formatearPeriodo(periodo: string): string {
	const [anio, mes] = periodo.split("-").map(Number);
	const nombre = nombreMes(mes);

	return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

// Correlativo de 4 dígitos por año: "0001-2026", "0002-2026"… Las anuladas conservan su número.
// Las valorizaciones de recepción (contratos recibidos) llevan su propia serie: "R-0001-2026".
export function siguienteNumero(
	anio: number,
	numeros: readonly (string | null)[],
	prefijo = "",
): string {
	const formato = new RegExp(`^${prefijo}(\\d{4})-${anio}$`);
	const mayor = numeros.reduce((maximo, numero) => {
		const coincidencia = numero ? formato.exec(numero) : null;

		return coincidencia ? Math.max(maximo, Number(coincidencia[1])) : maximo;
	}, 0);

	return `${prefijo}${String(mayor + 1).padStart(4, "0")}-${anio}`;
}

// Emisión: H&M la emite al cliente (contrato emitido). Recepción: H&M la recibe del proveedor.
export const ETIQUETA_TIPO_VALORIZACION = {
	EMITIDO: "Emisión",
	RECIBIDO: "Recepción",
} as const;

export function prefijoNumero(tipo: "EMITIDO" | "RECIBIDO"): string {
	return tipo === "RECIBIDO" ? "R-" : "";
}

export class ValorizacionNoEditableError extends Error {
	constructor() {
		super("Solo se puede modificar una valorización en borrador.");
		this.name = "ValorizacionNoEditableError";
	}
}

// Mensaje para enviar por WhatsApp una valorización emitida (el PDF se adjunta aparte).
export function mensajeValorizacion(
	valorizacion: Pick<Valorizacion, "numero" | "periodo" | "moneda" | "totales">,
	contrato: { codigo: string; proyecto: string },
): string {
	const lineas = [
		`*Valorización N.° ${valorizacion.numero ?? "—"}* · H&M`,
		`Contrato ${contrato.codigo} · ${contrato.proyecto}`,
		`Periodo: ${formatearPeriodo(valorizacion.periodo)}`,
	];
	if (valorizacion.totales) {
		lineas.push(
			`Total: ${formatearMoneda(valorizacion.totales.total, valorizacion.moneda)}`,
			`Neto a pagar: ${formatearMoneda(valorizacion.totales.netoPagable, valorizacion.moneda)}`,
		);
	}

	return lineas.join("\n");
}

// Lo valorizado del contrato en una emitida (subtotal 1 sin los ítems adicionales).
export function valorizadoDelContrato(totales: Totales | null): number {
	return (totales?.subtotal1 ?? 0) - (totales?.adicionales ?? 0);
}
