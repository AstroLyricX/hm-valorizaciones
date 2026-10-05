import Big from "big.js";

export type Moneda = "PEN" | "USD";

// Los montos se guardan como centavos enteros para evitar errores de punto flotante.
export function aCentavos(monto: string | number): number {
	return new Big(monto).times(100).round(0, Big.roundHalfUp).toNumber();
}

export function deCentavos(centavos: number): string {
	return new Big(centavos).div(100).toFixed(2);
}

export function formatearMoneda(centavos: number, moneda: Moneda): string {
	const monto = new Intl.NumberFormat("es-PE", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(new Big(centavos).div(100).toNumber());

	return `${moneda === "PEN" ? "S/" : "USD"} ${monto}`;
}
