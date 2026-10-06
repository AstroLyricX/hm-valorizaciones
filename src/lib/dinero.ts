import Big from "big.js";

export type Moneda = "PEN" | "USD";

// Los montos se guardan como centavos enteros para evitar errores de punto flotante.
export function aCentavos(monto: string | number): number {
	return new Big(monto).times(100).round(0, Big.roundHalfUp).toNumber();
}

export function deCentavos(centavos: number): string {
	return new Big(centavos).div(100).toFixed(2);
}

const formatoMonto = new Intl.NumberFormat("es-PE", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

// Monto sin símbolo, para tablas cuya cabecera ya indica la moneda.
export function formatearMonto(centavos: number): string {
	return formatoMonto.format(new Big(centavos).div(100).toNumber());
}

export function formatearMoneda(centavos: number, moneda: Moneda): string {
	return `${moneda === "PEN" ? "S/" : "USD"} ${formatearMonto(centavos)}`;
}
