import type { HmDatabase, RucConsultado } from "@/data/db";
import { ahoraIso } from "@/lib/fechas";
import { rucValido } from "@/shared/domain/ruc";

export type DatosRuc = Omit<RucConsultado, "consultadoEn">;

export type ResultadoRuc =
	| { tipo: "encontrado"; datos: DatosRuc; desde: "cache" | "sunat" }
	| { tipo: "invalido" }
	| { tipo: "no-encontrado" }
	// Sin conexión, sin Worker configurado o el servicio no responde: se completa a mano.
	| { tipo: "no-disponible" };

// Pasado este tiempo se vuelve a consultar (el estado y la condición pueden cambiar).
const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;
const ESPERA_MS = 8000;

export class RucService {
	constructor(
		private readonly database: HmDatabase,
		private readonly urlWorker: string,
		private readonly fetchExterno: typeof fetch = (...args) => globalThis.fetch(...args),
		private readonly ahora: () => Date = () => new Date(),
	) {}

	get disponible(): boolean {
		return this.urlWorker !== "";
	}

	// Primero valida el RUC; luego busca en la caché local y después en el Worker. Si nada
	// responde, el usuario sigue con la carga manual.
	async consultar(ruc: string): Promise<ResultadoRuc> {
		const numero = ruc.trim();
		if (!rucValido(numero)) {
			return { tipo: "invalido" };
		}

		const guardado = await this.database.rucConsultados.get(numero);
		const vigente =
			guardado && this.ahora().getTime() - new Date(guardado.consultadoEn).getTime() < VIGENCIA_MS;
		if (guardado && (vigente || !this.disponible || !navigator.onLine)) {
			const { consultadoEn: _consultadoEn, ...datos } = guardado;

			return { tipo: "encontrado", datos, desde: "cache" };
		}
		if (!this.disponible || !navigator.onLine) {
			return { tipo: "no-disponible" };
		}

		let respuesta: Response;
		try {
			respuesta = await this.fetchExterno(`${this.urlWorker.replace(/\/$/, "")}/ruc/${numero}`, {
				signal: AbortSignal.timeout(ESPERA_MS),
			});
		} catch {
			return { tipo: "no-disponible" };
		}
		if (respuesta.status === 404) {
			return { tipo: "no-encontrado" };
		}
		if (!respuesta.ok) {
			return { tipo: "no-disponible" };
		}
		const datos = (await respuesta.json()) as DatosRuc;
		await this.database.rucConsultados.put({ ...datos, consultadoEn: ahoraIso() });

		return { tipo: "encontrado", datos, desde: "sunat" };
	}
}
