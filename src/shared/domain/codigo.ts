// Siguiente código correlativo con prefijo (CLI-001, EQ-001…): continúa desde el número mayor.
export function siguienteCodigo(prefijo: string, codigos: readonly string[]): string {
	const mayor = codigos.reduce((max, codigo) => {
		const numero = Number(codigo.slice(prefijo.length));

		return codigo.startsWith(prefijo) && Number.isInteger(numero) ? Math.max(max, numero) : max;
	}, 0);

	return `${prefijo}${String(mayor + 1).padStart(3, "0")}`;
}
