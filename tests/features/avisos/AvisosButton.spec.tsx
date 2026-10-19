import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, parseISO } from "date-fns";

import { db } from "../../../src/data/db";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { hoyIso } from "../../../src/features/contratos/domain/contrato";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { CLIENTE, excavadora } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { contratoDatos } from "../contratos/fixtures";

// La pantalla usa la fecha real: el contrato vence en 3 días desde hoy.
function dentroDe(dias: number): string {
	return format(addDays(parseISO(hoyIso()), dias), "yyyy-MM-dd");
}

const notificaciones: { titulo: string; opciones?: NotificationOptions }[] = [];

class NotificationFalsa {
	static permission: NotificationPermission = "default";
	static requestPermission = jest.fn(async () => {
		NotificationFalsa.permission = "granted";

		return Promise.resolve("granted" as const);
	});

	constructor(titulo: string, opciones?: NotificationOptions) {
		notificaciones.push({ titulo, opciones });
	}
}

beforeEach(async () => {
	localStorage.clear();
	notificaciones.length = 0;
	NotificationFalsa.permission = "default";
	Object.defineProperty(window, "Notification", {
		value: NotificationFalsa,
		configurable: true,
	});
	await db.delete();
	await db.open();
	signInAs();
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	await contratoService.crear(
		contratoDatos(clienteId, equipoId, { fechaInicio: dentroDe(-30), fechaFin: dentroDe(3) }),
		"ana@hm.pe",
	);
});

afterEach(() => {
	Reflect.deleteProperty(window, "Notification");
});

test("la campana cuenta los avisos sin leer y los marca como leídos", async () => {
	const user = userEvent.setup();
	renderRoute("/");

	await user.click(await screen.findByRole("button", { name: "Avisos, 1 sin leer" }));
	const lista = await screen.findByRole("list", { name: "Lista de avisos" });

	expect(within(lista).getByRole("link", { name: /Vence en 3 días: CTR-001/ })).toHaveAttribute(
		"href",
		expect.stringContaining("/contratos/"),
	);

	await user.click(screen.getByRole("button", { name: "Marcar como leídos" }));

	expect(await screen.findByRole("button", { name: "Avisos" })).toBeInTheDocument();
	// Lo leído se recuerda en el dispositivo.
	expect(localStorage.getItem("hm-avisos-leidos")).toMatch(/"vence:/);
});

test("no repite la notificación de una alerta ya avisada", async () => {
	NotificationFalsa.permission = "granted";
	renderRoute("/");

	await waitFor(() => {
		expect(notificaciones).toHaveLength(1);
	});
	const notificados = localStorage.getItem("hm-avisos-notificados");
	renderRoute("/");

	// La segunda apertura de la app también carga sus avisos.
	await waitFor(() => {
		expect(screen.getAllByRole("button", { name: "Avisos, 1 sin leer" })).toHaveLength(2);
	});
	expect(notificaciones).toHaveLength(1);
	expect(localStorage.getItem("hm-avisos-notificados")).toBe(notificados);
});

test("al activar las notificaciones avisa las alertas nuevas una sola vez", async () => {
	const user = userEvent.setup();
	renderRoute("/");

	await user.click(await screen.findByRole("button", { name: "Avisos, 1 sin leer" }));
	await user.click(await screen.findByRole("button", { name: "Activar notificaciones" }));

	await waitFor(() => {
		expect(notificaciones).toHaveLength(1);
	});
	expect(notificaciones[0].titulo).toBe("Vence en 3 días: CTR-001");
	expect(screen.queryByRole("button", { name: "Activar notificaciones" })).not.toBeInTheDocument();

	// Queda anotada para no repetirla al volver a abrir la app, pero sigue sin leer.
	expect(localStorage.getItem("hm-avisos-notificados")).toMatch(/"vence:/);
	expect(screen.getByRole("button", { name: "Avisos, 1 sin leer" })).toBeInTheDocument();
});
