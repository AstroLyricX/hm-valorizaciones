import { avisarPendientes, type Entorno, manejarSolicitud } from "./avisos";

// Cloudflare Worker de avisos por Telegram. Pasos para publicarlo en worker/avisos/README.md.
export default {
	async fetch(solicitud: Request, entorno: Entorno): Promise<Response> {
		return manejarSolicitud(solicitud, entorno);
	},
	// Todos los días a las 7:00 de Lima (12:00 UTC), según el cron de wrangler.toml.
	async scheduled(_evento: unknown, entorno: Entorno): Promise<void> {
		await avisarPendientes(entorno);
	},
};
