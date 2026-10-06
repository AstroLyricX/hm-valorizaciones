import type { Moneda } from "@/lib/dinero";

const UNIDADES = [
	"CERO",
	"UNO",
	"DOS",
	"TRES",
	"CUATRO",
	"CINCO",
	"SEIS",
	"SIETE",
	"OCHO",
	"NUEVE",
	"DIEZ",
	"ONCE",
	"DOCE",
	"TRECE",
	"CATORCE",
	"QUINCE",
	"DIECISÉIS",
	"DIECISIETE",
	"DIECIOCHO",
	"DIECINUEVE",
	"VEINTE",
	"VEINTIUNO",
	"VEINTIDÓS",
	"VEINTITRÉS",
	"VEINTICUATRO",
	"VEINTICINCO",
	"VEINTISÉIS",
	"VEINTISIETE",
	"VEINTIOCHO",
	"VEINTINUEVE",
] as const;
const DECENAS = [
	"",
	"",
	"",
	"TREINTA",
	"CUARENTA",
	"CINCUENTA",
	"SESENTA",
	"SETENTA",
	"OCHENTA",
	"NOVENTA",
];
const CENTENAS = [
	"",
	"CIENTO",
	"DOSCIENTOS",
	"TRESCIENTOS",
	"CUATROCIENTOS",
	"QUINIENTOS",
	"SEISCIENTOS",
	"SETECIENTOS",
	"OCHOCIENTOS",
	"NOVECIENTOS",
];

function hastaNoventaYNueve(numero: number): string {
	if (numero < 30) {
		return UNIDADES[numero];
	}
	const unidad = numero % 10;

	return unidad === 0
		? DECENAS[Math.floor(numero / 10)]
		: `${DECENAS[Math.floor(numero / 10)]} Y ${UNIDADES[unidad]}`;
}

function hastaNovecientos(numero: number): string {
	if (numero === 100) {
		return "CIEN";
	}
	const centena = Math.floor(numero / 100);
	const resto = numero % 100;
	const partes = [CENTENAS[centena], resto > 0 ? hastaNoventaYNueve(resto) : ""];

	return partes.filter(Boolean).join(" ");
}

// Delante de MIL y MILLONES: "UNO" → "UN" y "VEINTIUNO" → "VEINTIÚN" (VEINTIÚN MIL).
function apocope(texto: string): string {
	return texto.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
}

// Número entero en letras, en mayúsculas, hasta 999 999 999 999.
export function numeroEnLetras(numero: number): string {
	if (!Number.isInteger(numero) || numero < 0 || numero >= 1e12) {
		throw new RangeError(`No se puede escribir ${numero} en letras.`);
	}
	if (numero === 0) {
		return "CERO";
	}
	const millones = Math.floor(numero / 1e6);
	const miles = Math.floor((numero % 1e6) / 1000);
	const resto = numero % 1000;
	const partes: string[] = [];

	if (millones > 0) {
		partes.push(millones === 1 ? "UN MILLÓN" : `${apocope(numeroEnLetras(millones))} MILLONES`);
	}
	if (miles > 0) {
		partes.push(miles === 1 ? "MIL" : `${apocope(hastaNovecientos(miles))} MIL`);
	}
	if (resto > 0) {
		partes.push(hastaNovecientos(resto));
	}

	return partes.join(" ");
}

const NOMBRE_MONEDA: Record<Moneda, string> = {
	USD: "DÓLARES AMERICANOS",
	PEN: "SOLES",
};

// Monto de la factura en letras, como en la hoja VALORIZACION del xlsm:
// 295214 centavos → "DOS MIL NOVECIENTOS CINCUENTA Y DOS CON 14/100 DÓLARES AMERICANOS."
export function montoEnLetras(centavos: number, moneda: Moneda): string {
	if (!Number.isInteger(centavos) || centavos < 0) {
		throw new RangeError(`Monto inválido: ${centavos}.`);
	}
	const enteros = Math.floor(centavos / 100);
	const decimales = String(centavos % 100).padStart(2, "0");

	return `${numeroEnLetras(enteros)} CON ${decimales}/100 ${NOMBRE_MONEDA[moneda]}.`;
}
