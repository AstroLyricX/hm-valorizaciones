const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// Valida el RUC peruano: 11 dígitos, prefijo válido y dígito verificador (módulo 11 de SUNAT).
export function rucValido(ruc: string): boolean {
	if (!/^(10|15|17|20)\d{9}$/.test(ruc)) {
		return false;
	}

	const suma = PESOS.reduce((total, peso, i) => total + peso * Number(ruc[i]), 0);
	const digitoVerificador = (11 - (suma % 11)) % 10;

	return digitoVerificador === Number(ruc[10]);
}
