// Instalación de la app (PWA). Chrome, Edge y Android avisan que se puede instalar con el evento
// "beforeinstallprompt"; se guarda para mostrar nuestro propio botón. Safari (iPhone y iPad) no
// tiene ese evento: allí se explica cómo agregarla a la pantalla de inicio.

interface EventoInstalacion extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type EstadoInstalacion =
	// Ya se abre como app instalada.
	| "instalada"
	// El navegador permite instalarla con un botón.
	| "disponible"
	// iPhone o iPad: se instala desde Compartir → Agregar a pantalla de inicio.
	| "ios"
	// Navegador sin instalación (o el usuario ya la descartó en esta visita).
	| "no-disponible";

let pendiente: EventoInstalacion | null = null;
let instalada = false;
const oyentes = new Set<() => void>();

function avisar(): void {
	for (const oyente of oyentes) {
		oyente();
	}
}

export function esStandalone(ventana: Window = window): boolean {
	return (
		ventana.matchMedia("(display-mode: standalone)").matches ||
		(ventana.navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}

export function esIos(navegador: Navigator = navigator): boolean {
	// El iPad con iPadOS se presenta como Mac, pero tiene pantalla táctil.
	return (
		/iPad|iPhone|iPod/.test(navegador.userAgent) ||
		(navegador.userAgent.includes("Macintosh") && navegador.maxTouchPoints > 1)
	);
}

// Se llama al iniciar la app, antes de React, para no perder el aviso del navegador.
export function escucharInstalacion(ventana: Window = window): void {
	ventana.addEventListener("beforeinstallprompt", (evento) => {
		evento.preventDefault();
		pendiente = evento as EventoInstalacion;
		avisar();
	});
	ventana.addEventListener("appinstalled", () => {
		pendiente = null;
		instalada = true;
		avisar();
	});
}

export function estadoInstalacion(): EstadoInstalacion {
	if (instalada || esStandalone()) {
		return "instalada";
	}
	if (pendiente) {
		return "disponible";
	}

	return esIos() ? "ios" : "no-disponible";
}

export function suscribirInstalacion(oyente: () => void): () => void {
	oyentes.add(oyente);

	return () => oyentes.delete(oyente);
}

// Muestra el diálogo del navegador. El aviso solo se puede usar una vez.
export async function instalarApp(): Promise<boolean> {
	if (!pendiente) {
		return false;
	}
	const evento = pendiente;
	pendiente = null;
	await evento.prompt();
	const { outcome } = await evento.userChoice;
	if (outcome === "accepted") {
		instalada = true;
	}
	avisar();

	return outcome === "accepted";
}

// Solo para pruebas: vuelve al estado inicial (sin aviso y sin instalar).
export function reiniciarInstalacion(): void {
	pendiente = null;
	instalada = false;
	avisar();
}
