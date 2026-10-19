// Qué avisos ya se leyeron o se notificaron en este dispositivo. Es solo una comodidad:
// si el navegador borra el almacenamiento, los avisos vuelven a salir como nuevos.
export const LEIDOS = "hm-avisos-leidos";
export const NOTIFICADOS = "hm-avisos-notificados";

export function leerIds(clave: string): Set<string> {
	try {
		const guardado = JSON.parse(localStorage.getItem(clave) ?? "[]") as unknown;

		return new Set(Array.isArray(guardado) ? guardado.filter((id) => typeof id === "string") : []);
	} catch {
		return new Set();
	}
}

// Guarda solo los ids de avisos que siguen activos para que la lista no crezca sin fin.
export function guardarIds(clave: string, ids: Iterable<string>, activos: readonly string[]): void {
	const vigentes = new Set(activos);
	try {
		localStorage.setItem(clave, JSON.stringify([...ids].filter((id) => vigentes.has(id))));
	} catch {
		// Sin almacenamiento (modo privado): los avisos funcionan igual, sin recordar lo leído.
	}
}
