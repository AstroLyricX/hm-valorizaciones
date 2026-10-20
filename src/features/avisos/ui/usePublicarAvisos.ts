import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

import { entorno } from "@/app/entorno";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { hoyIso } from "@/features/contratos/domain/contrato";
import { valorizacionService } from "@/features/valorizaciones/application/valorizacionService.instance";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

import { contratosParaTelegram } from "../domain/avisos";

// Último envío aceptado por el Worker: no se vuelve a subir lo mismo.
export const PUBLICADO = "hm-avisos-publicado";
const ESPERA_MS = 3000;

function leerPublicado(): string | null {
	try {
		return localStorage.getItem(PUBLICADO);
	} catch {
		return null;
	}
}

// Sube al Worker de Telegram los contratos vigentes cuando cambian y hay conexión.
export function usePublicarAvisos(url = entorno.avisosApiUrl): void {
	const enLinea = useOnlineStatus();
	const [hoy] = useState(hoyIso);
	const cuerpo = useLiveQuery(async () => {
		if (url === "") {
			return undefined;
		}
		const [contratos, valorizaciones, terceros] = await Promise.all([
			contratoRepository.listar(),
			valorizacionService.listar(),
			terceroRepository.listar(),
		]);

		return JSON.stringify({
			contratos: contratosParaTelegram({ contratos, valorizaciones, terceros, hoy }),
		});
	}, [url, hoy]);

	useEffect(() => {
		if (cuerpo === undefined || !enLinea || cuerpo === leerPublicado()) {
			return;
		}
		// Espera a que terminen los cambios seguidos (por ejemplo, al escribir horas).
		const temporizador = setTimeout(() => {
			fetch(`${url.replace(/\/$/, "")}/contratos`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: cuerpo,
			})
				.then((respuesta) => {
					if (respuesta.ok) {
						try {
							localStorage.setItem(PUBLICADO, cuerpo);
						} catch {
							// Sin almacenamiento se vuelve a subir la próxima vez; no hace daño.
						}
					}
				})
				// Sin conexión con el Worker: se reintenta con el próximo cambio o al volver la conexión.
				.catch(() => undefined);
		}, ESPERA_MS);

		return () => {
			clearTimeout(temporizador);
		};
	}, [cuerpo, enLinea, url]);
}
