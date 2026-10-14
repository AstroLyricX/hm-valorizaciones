import { type Entorno, manejarSolicitud } from "./consulta";

// Cloudflare Worker de consulta de RUC (fase 13). Pasos para publicarlo en worker/ruc/README.md.
export default {
	async fetch(solicitud: Request, entorno: Entorno): Promise<Response> {
		return manejarSolicitud(solicitud, entorno);
	},
};
