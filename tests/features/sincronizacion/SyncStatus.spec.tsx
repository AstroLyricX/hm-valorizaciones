import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";

import { db } from "../../../src/data/db";
import type { ResultadoSync } from "../../../src/data/sync/syncEngine";
import { DemoSessionProvider } from "../../../src/features/auth/DemoSessionProvider";
import { ReautenticacionRequeridaError } from "../../../src/features/auth/SessionContext";
import { type Motor, SyncProvider } from "../../../src/features/sincronizacion/SyncProvider";
import { SyncStatus } from "../../../src/features/sincronizacion/SyncStatus";

const SIN_CAMBIOS: ResultadoSync = {
	subidos: 0,
	bajados: 0,
	archivos: 0,
	conflictos: [],
	avisos: [],
};

function motor(
	implementacion: () => Promise<ResultadoSync> = async () => Promise.resolve(SIN_CAMBIOS),
) {
	return { sincronizar: jest.fn(implementacion) } satisfies Motor;
}

function renderizar(motorSimulado?: Motor) {
	render(
		<DemoSessionProvider>
			<SyncProvider motor={motorSimulado}>
				<SyncStatus />
				<Toaster />
			</SyncProvider>
		</DemoSessionProvider>,
	);
}

function conexion(valor: boolean) {
	Object.defineProperty(navigator, "onLine", { configurable: true, value: valor });
	window.dispatchEvent(new Event(valor ? "online" : "offline"));
}

async function pendienteEnOutbox() {
	await db.outbox.add({
		entidad: "terceros",
		registroId: "t1",
		operacion: "upsert",
		payload: { id: "t1" },
		createdAt: "2026-10-12T10:00:00.000Z",
		intentos: 0,
	});
}

beforeEach(async () => {
	await db.delete();
	await db.open();
	conexion(true);
});

test("sin SharePoint configurado muestra solo el estado de la conexión", async () => {
	renderizar();

	expect(await screen.findByText("En línea")).toBeInTheDocument();
});

test("sincroniza al abrir la app y queda al día", async () => {
	const simulado = motor();
	renderizar(simulado);

	expect(await screen.findByText("Todo sincronizado")).toBeInTheDocument();
	expect(simulado.sincronizar).toHaveBeenCalledTimes(1);
});

test("muestra los cambios por sincronizar y sincroniza al tocarlo", async () => {
	const user = userEvent.setup();
	const simulado = motor();
	await pendienteEnOutbox();
	renderizar(simulado);

	const estado = await screen.findByRole("button", { name: "1 cambio por sincronizar" });
	await user.click(estado);

	expect(simulado.sincronizar).toHaveBeenCalledTimes(2);
});

test("sin conexión avisa que los cambios quedan en el equipo y sincroniza al volver la red", async () => {
	const simulado = motor();
	await pendienteEnOutbox();
	renderizar(simulado);
	await screen.findByText("1 cambio por sincronizar");

	act(() => {
		conexion(false);
	});
	expect(
		await screen.findByText("Sin conexión: 1 cambio guardados en este equipo"),
	).toBeInTheDocument();

	act(() => {
		conexion(true);
	});
	await screen.findByText("1 cambio por sincronizar");
	expect(simulado.sincronizar).toHaveBeenCalledTimes(2);
});

test("si Microsoft pide volver a iniciar sesión, lo indica", async () => {
	renderizar(motor(async () => Promise.reject(new ReautenticacionRequeridaError())));

	expect(await screen.findByText("Inicia sesión de nuevo para sincronizar")).toBeInTheDocument();
});

test("avisa cuando una valorización también cambió en otro dispositivo", async () => {
	renderizar(
		motor(async () =>
			Promise.resolve({
				...SIN_CAMBIOS,
				conflictos: [{ tabla: "valorizaciones", id: "v1", ganador: "remoto" }],
				avisos: [
					"Hay 2 valorizaciones emitidas con el número 0002-2026. Anula la que sobra y vuelve a emitirla.",
				],
			}),
		),
	);

	expect(
		await screen.findByText(
			"Una valorización también se modificó en otro dispositivo: se conservó la versión más reciente.",
		),
	).toBeInTheDocument();
	expect(
		screen.getByText(/Hay 2 valorizaciones emitidas con el número 0002-2026/),
	).toBeInTheDocument();
});

test("un error inesperado permite reintentar", async () => {
	jest.spyOn(console, "error").mockImplementation(() => undefined);
	renderizar(motor(async () => Promise.reject(new Error("500"))));

	expect(await screen.findByText("No se pudo sincronizar. Reintentar")).toBeInTheDocument();
});
