import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";

import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { hoyIso } from "@/features/contratos/domain/contrato";
import { valorizacionService } from "@/features/valorizaciones/application/valorizacionService.instance";

import { type Aviso, calcularAvisos } from "../domain/avisos";
import { guardarIds, leerIds, LEIDOS, NOTIFICADOS } from "./memoriaAvisos";
import { notificar, permisoNotificaciones } from "./notificacionSistema";

export interface EstadoAvisos {
	// undefined mientras se cargan.
	avisos: Aviso[] | undefined;
	noLeidos: Aviso[];
	marcarLeidos: (ids: readonly string[]) => void;
	permiso: NotificationPermission | "no-disponible";
	activarNotificaciones: () => Promise<void>;
}

export function useAvisos(): EstadoAvisos {
	const [hoy] = useState(hoyIso);
	const [leidos, setLeidos] = useState(() => leerIds(LEIDOS));
	const [permiso, setPermiso] = useState(permisoNotificaciones);
	const avisos = useLiveQuery(async (): Promise<Aviso[]> => {
		const [contratos, valorizaciones, terceros] = await Promise.all([
			contratoRepository.listar(),
			valorizacionService.listar(),
			terceroRepository.listar(),
		]);

		return calcularAvisos({ contratos, valorizaciones, terceros, hoy });
	}, [hoy]);
	const noLeidos = useMemo(
		() => (avisos ?? []).filter((aviso) => !leidos.has(aviso.id)),
		[avisos, leidos],
	);

	// Las alertas nuevas salen una sola vez como notificación del sistema. Los avisos
	// informativos (borradores, emitidas) solo quedan en la campana: suelen ser del mismo usuario.
	useEffect(() => {
		if (avisos === undefined || permiso !== "granted") {
			return;
		}
		const notificados = leerIds(NOTIFICADOS);
		const nuevos = avisos.filter(
			(aviso) => aviso.nivel === "alerta" && !notificados.has(aviso.id) && !leidos.has(aviso.id),
		);
		const activos = avisos.map((aviso) => aviso.id);
		guardarIds(NOTIFICADOS, [...notificados, ...nuevos.map((aviso) => aviso.id)], activos);
		notificar(nuevos).catch((error: unknown) => {
			console.error(error);
		});
	}, [avisos, permiso, leidos]);

	const marcarLeidos = useCallback(
		(ids: readonly string[]) => {
			const todos = new Set([...leidos, ...ids]);
			guardarIds(
				LEIDOS,
				todos,
				(avisos ?? []).map((aviso) => aviso.id),
			);
			setLeidos(todos);
		},
		[avisos, leidos],
	);

	const activarNotificaciones = useCallback(async () => {
		setPermiso(await Notification.requestPermission());
	}, []);

	return { avisos, noLeidos, marcarLeidos, permiso, activarNotificaciones };
}
