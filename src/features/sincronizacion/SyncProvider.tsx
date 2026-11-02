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

// Con la app a la vista se consulta SharePoint cada 30 s: lo que registran los demás aparece
// casi al instante. /delta solo trae lo que cambió, así que la consulta es liviana.
const INTERVALO = 30 * 1000;
// Tras un cambio local se espera un momento por si llegan más (escribir horas, por ejemplo).
const ESPERA_TRAS_CAMBIO = 1000;

export interface Motor {
	sincronizar: () => Promise<ResultadoSync>;
	descargar?: (ruta: string) => Promise<Blob>;
}

// Cada aviso se muestra una vez por sesión: la sincronización corre cada 30 s y lo repetiría.
const CLAVE_REAUTENTICACION = "hm-reautenticacion-automatica";

// Al abrir la app, si la sesión de Microsoft para sincronizar venció (dura 24 h), se renueva
// sola una vez por sesión del navegador: si Microsoft recuerda al usuario es un ir y volver sin
// contraseña. Más tarde no se hace solo, para no sacar a nadie de lo que está haciendo.
function reautenticarAlAbrir(): boolean {
	try {
		if (sessionStorage.getItem(CLAVE_REAUTENTICACION)) {
			return false;
		}
		sessionStorage.setItem(CLAVE_REAUTENTICACION, "1");

		return true;
	} catch {
		return false;
	}
}

function avisarResultado(resultado: ResultadoSync, yaAvisados: Set<string>): void {
	const valorizaciones = resultado.conflictos.filter(
		(conflicto) => conflicto.tabla === "valorizaciones" || conflicto.tabla === "valorizacionItems",
	);
	if (valorizaciones.length > 0) {
		toast.warning(
			"Una valorización también se modificó en otro dispositivo: se conservó la versión más reciente.",
		);
	}
	for (const aviso of new Set(resultado.avisos)) {
		if (!yaAvisados.has(aviso)) {
			yaAvisados.add(aviso);
			toast.warning(aviso);
		}
	}
}

// Sincroniza con SharePoint al abrir la app, al recuperar la conexión, al volver a la app,
// cada 30 segundos mientras está a la vista y apenas hay un cambio local.
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
	// Causa del último fallo, para mostrarla en el estado.
	const [detalleError, setDetalleError] = useState<string | null>(null);
	const yaAvisados = useRef(new Set<string>());
	const primeraDeLaSesion = useRef(true);
	// La primera sincronización de esta sesión ya terminó (bien o mal).
	const [primeraIntentada, setPrimeraIntentada] = useState(false);
	// undefined: cargando; null: este dispositivo nunca se sincronizó.
	const sincronizadoAntes = useLiveQuery(
		async () => (await db.syncMeta.get("ultimaSincronizacion")) ?? null,
	);
	const pendientes =
		useLiveQuery(
			async () =>
				(await db.outbox.count()) +
				(await db.archivosPendientes.count()) +
				(await db.archivosDocumento.where("pendiente").equals(1).count()),
		) ?? 0;

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
		const alAbrir = primeraDeLaSesion.current;
		primeraDeLaSesion.current = false;
		try {
			const resultado = await motor.sincronizar();
			setUltima(new Date().toISOString());
			setEstadoInterno("al-dia");
			setDetalleError(null);
			avisarResultado(resultado, yaAvisados.current);
		} catch (error) {
			if (error instanceof ReautenticacionRequeridaError) {
				setEstadoInterno("reautenticar");
				if (alAbrir && reautenticarAlAbrir()) {
					void reautenticarSesion?.();
				}
			} else if (error instanceof SinConexionError) {
				setEstadoInterno("al-dia");
			} else {
				console.error(error);
				setDetalleError(error instanceof Error ? error.message : String(error));
				setEstadoInterno("error");
			}
		} finally {
			setPrimeraIntentada(true);
		}
	}, [motor, reautenticarSesion]);

	// Disparadores: al iniciar, al volver la conexión, al volver a la app y cada 30 segundos.
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
		// En segundo plano no se consulta: al volver a la app se sincroniza de inmediato.
		const intervalo = setInterval(() => {
			if (document.visibilityState === "visible") {
				void sincronizar();
			}
		}, INTERVALO);

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

	// En un dispositivo nuevo se espera la primera descarga para no mostrar listas vacías (y que
	// nadie registre de nuevo lo que ya existe). Sin conexión se trabaja con lo que haya.
	const descargando = motor !== null && enLinea && sincronizadoAntes === null && !primeraIntentada;

	const descargarArchivo = useMemo(() => motor?.descargar?.bind(motor), [motor]);

	const valor = useMemo<Sincronizacion>(
		() => ({
			estado,
			activa: motor !== null,
			detalleError,
			descargando,
			pendientes,
			ultima,
			sincronizar,
			reautenticar,
			descargarArchivo,
		}),
		[
			estado,
			motor,
			detalleError,
			descargando,
			pendientes,
			ultima,
			sincronizar,
			reautenticar,
			descargarArchivo,
		],
	);

	return <SyncContext value={valor}>{children}</SyncContext>;
}
