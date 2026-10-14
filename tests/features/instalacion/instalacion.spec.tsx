import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { db } from "../../../src/data/db";
import {
	escucharInstalacion,
	reiniciarInstalacion,
} from "../../../src/features/instalacion/instalacion";
import { renderRoute, signInAs } from "../../support/renderRoute";

const AGENTE_ESCRITORIO = navigator.userAgent;

// El aviso del navegador (Chrome, Edge, Android) con la respuesta del usuario.
function avisoDelNavegador(respuesta: "accepted" | "dismissed" = "accepted") {
	const evento = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
		prompt: jest.Mock;
		userChoice: Promise<{ outcome: string }>;
	};
	evento.prompt = jest.fn(async () => Promise.resolve());
	evento.userChoice = Promise.resolve({ outcome: respuesta });
	act(() => {
		window.dispatchEvent(evento);
	});

	return evento;
}

function agente(valor: string) {
	Object.defineProperty(navigator, "userAgent", { configurable: true, value: valor });
}

beforeAll(() => {
	escucharInstalacion(window);
});

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	agente(AGENTE_ESCRITORIO);
	reiniciarInstalacion();
});

test("sin aviso del navegador no muestra el botón", async () => {
	renderRoute("/");

	await screen.findByRole("heading", { level: 1, name: /Hola,/ });
	expect(screen.queryByRole("region", { name: "Instalar la app" })).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /Instalar app/ })).not.toBeInTheDocument();
});

test("con el aviso del navegador instala la app desde Inicio", async () => {
	const user = userEvent.setup();
	renderRoute("/");
	await screen.findByRole("heading", { level: 1, name: /Hola,/ });
	const evento = avisoDelNavegador("accepted");

	expect(evento.defaultPrevented).toBe(true);
	const aviso = await screen.findByRole("region", { name: "Instalar la app" });
	// También en el menú lateral.
	expect(screen.getAllByRole("button", { name: /Instalar app/ }).length).toBeGreaterThan(1);
	await user.click(within(aviso).getByRole("button", { name: /Instalar app/ }));

	expect(evento.prompt).toHaveBeenCalledTimes(1);
	expect(
		await screen.findByText("App instalada. Ábrela desde tu pantalla de inicio o tu escritorio."),
	).toBeInTheDocument();
	expect(screen.queryByRole("region", { name: "Instalar la app" })).not.toBeInTheDocument();
});

test("«Ahora no» oculta el aviso y no vuelve a aparecer en este equipo", async () => {
	const user = userEvent.setup();
	renderRoute("/");
	await screen.findByRole("heading", { level: 1, name: /Hola,/ });
	avisoDelNavegador("dismissed");

	await user.click(
		within(await screen.findByRole("region", { name: "Instalar la app" })).getByRole("button", {
			name: /Ahora no/,
		}),
	);

	expect(screen.queryByRole("region", { name: "Instalar la app" })).not.toBeInTheDocument();
	expect(localStorage.getItem("hm.instalacion.descartada")).toBe("1");
});

test("en iPhone explica cómo agregarla a la pantalla de inicio", async () => {
	const user = userEvent.setup();
	agente(
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
	);
	renderRoute("/");

	const aviso = await screen.findByRole("region", { name: "Instalar la app" });
	await user.click(within(aviso).getByRole("button", { name: /Instalar app/ }));

	const pasos = await screen.findByRole("dialog", { name: "Instalar en iPhone o iPad" });
	expect(pasos).toHaveTextContent("Toca Compartir");
	expect(pasos).toHaveTextContent("«Agregar a pantalla de inicio»");
});
