import { useLiveQuery } from "dexie-react-hooks";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { entorno } from "@/app/entorno";
import { db } from "@/data/db";
import { GraphClient, SinConexionError } from "@/data/sync/graphClient";
import { type ResultadoSync, SyncEngine } from "@/data/sync/syncEngine";
import { ReautenticacionRequeridaError } from "@/features/auth/SessionContext";
import { useSession } from "@/features/auth/useSession";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

import { type EstadoSync, type Sincronizacion, SyncContext } from "./SyncContext";

const CADA_CINCO_MINUTOS = 5 * 60 * 1000;
// Tras un cambio local se espera un poco por si llegan más (escribir horas, por ejemplo).
const ESPERA_TRAS_CAMBIO = 3000;

export interface Motor {
	sincronizar: () => Promise<ResultadoSync>;
}

function avisarResultado(resultado: ResultadoSync): void {
	const valorizaciones = resultado.conflictos.filter(
		(conflicto) => conflicto.tabla === "valorizaciones" || conflicto.tabla === "valorizacionItems",
	);
	if (valorizaciones.length > 0) {
		toast.warning(
			"Una valorización también se modificó en otro dispositivo: se conservó la versión más reciente.",
		);
	}
	for (const aviso of new Set(resultado.avisos)) {
		toast.warning(aviso);
	}
}

// Sincroniza con SharePoint al abrir la app, al recuperar la conexión, al volver a la app,
// cada 5 minutos y poco después de cada cambio local.
export function SyncProvider({
	children,
	motor: motorDePrueba,
}: {
	children: ReactNode;
	// Solo para pruebas: reemplaza el motor real.
	motor?: Motor;
}) {
	const { user, obtenerToken, reautenticar: reautenticarSesion } = useSession();
	const enLinea = useOnlineStatus();
	const [estadoInterno, setEstadoInterno] = useState<EstadoSync>("al-dia");
	const [ultima, setUltima] = useState<string | null>(null);
	const pendientes =
		useLiveQuery(async () => (await db.outbox.count()) + (await db.archivosPendientes.count())) ??
		0;

	const motor = useMemo<Motor | null>(() => {
		if (motorDePrueba) {
			return motorDePrueba;
		}
		if (!user || !obtenerToken || !entorno.sharepointSitio) {
			return null;
		}

		return new SyncEngine(db, new GraphClient({ obtenerToken }), entorno.sharepointSitio);
	}, [motorDePrueba, user, obtenerToken]);

	const sincronizar = useCallback(async () => {
		if (!motor || !navigator.onLine) {
			return;
		}
		setEstadoInterno("sincronizando");
		try {
			const resultado = await motor.sincronizar();
			setUltima(new Date().toISOString());
			setEstadoInterno("al-dia");
			avisarResultado(resultado);
		} catch (error) {
			if (error instanceof ReautenticacionRequeridaError) {
				setEstadoInterno("reautenticar");
			} else if (error instanceof SinConexionError) {
				setEstadoInterno("al-dia");
			} else {
				console.error(error);
				setEstadoInterno("error");
			}
		}
	}, [motor]);

	// Disparadores: al iniciar, al volver la conexión, al volver a la app y cada 5 minutos.
	useEffect(() => {
		if (!motor) {
			return undefined;
		}
		// La primera, apenas se monta la app (fuera del render).
		const inicial = setTimeout(() => void sincronizar(), 0);
		const alVolver = () => {
			if (document.visibilityState === "visible") {
				void sincronizar();
			}
		};
		const alConectar = () => void sincronizar();
		window.addEventListener("online", alConectar);
		document.addEventListener("visibilitychange", alVolver);
		const intervalo = setInterval(() => void sincronizar(), CADA_CINCO_MINUTOS);

		return () => {
			window.removeEventListener("online", alConectar);
			document.removeEventListener("visibilitychange", alVolver);
			clearTimeout(inicial);
			clearInterval(intervalo);
		};
	}, [motor, sincronizar]);

	// Poco después de cada cambio local.
	const anteriores = useRef(pendientes);
	useEffect(() => {
		const aumentaron = pendientes > anteriores.current;
		anteriores.current = pendientes;
		if (!motor || !aumentaron) {
			return undefined;
		}
		const espera = setTimeout(() => void sincronizar(), ESPERA_TRAS_CAMBIO);

		return () => clearTimeout(espera);
	}, [motor, pendientes, sincronizar]);

	const reautenticar = useCallback(async () => {
		await reautenticarSesion?.();
	}, [reautenticarSesion]);

	const estado: EstadoSync = !motor
		? "desactivada"
		: !enLinea
			? "sin-conexion"
			: estadoInterno === "al-dia" && pendientes > 0
				? "pendiente"
				: estadoInterno;

	const valor = useMemo<Sincronizacion>(
		() => ({ estado, activa: motor !== null, pendientes, ultima, sincronizar, reautenticar }),
		[estado, motor, pendientes, ultima, sincronizar, reautenticar],
	);

	return <SyncContext value={valor}>{children}</SyncContext>;
}
