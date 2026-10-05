// Normaliza para buscar sin distinguir tildes ni mayúsculas ("Ñuñoa" → "nunoa").
export function normalizar(texto: string): string {
	return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function coincide(texto: string, campos: readonly string[]): boolean {
	const buscado = normalizar(texto.trim());

	return buscado === "" || campos.some((campo) => normalizar(campo).includes(buscado));
}
