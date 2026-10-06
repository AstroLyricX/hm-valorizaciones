import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoGuardado = "guardado" | "pendiente" | "error";

// Agrupa los cambios que llegan seguidos y los guarda tras una pausa breve al escribir.
// Antes de salir de la pantalla guarda lo pendiente.
export function useAutoguardado(
	guardar: (clave: string, valor: string) => Promise<void>,
	espera = 500,
): { programar: (clave: string, valor: string) => void; estado: EstadoGuardado } {
	const [estado, setEstado] = useState<EstadoGuardado>("guardado");
	const pendientes = useRef(new Map<string, string>());
	const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const guardarRef = useRef(guardar);
	useEffect(() => {
		guardarRef.current = guardar;
	}, [guardar]);

	const vaciar = useCallback(async () => {
		clearTimeout(temporizador.current);
		const lote = [...pendientes.current];
		pendientes.current.clear();
		try {
			await Promise.all(lote.map(async ([clave, valor]) => guardarRef.current(clave, valor)));
			if (pendientes.current.size === 0) {
				setEstado("guardado");
			}
		} catch {
			setEstado("error");
		}
	}, []);

	const programar = useCallback(
		(clave: string, valor: string) => {
			pendientes.current.set(clave, valor);
			setEstado("pendiente");
			clearTimeout(temporizador.current);
			temporizador.current = setTimeout(() => void vaciar(), espera);
		},
		[espera, vaciar],
	);

	useEffect(() => () => void vaciar(), [vaciar]);

	return { programar, estado };
}
