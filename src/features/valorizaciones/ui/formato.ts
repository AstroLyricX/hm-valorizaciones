const formatoHoras = new Intl.NumberFormat("es-PE", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function horas(valor: string): string {
	return formatoHoras.format(Number(valor));
}
