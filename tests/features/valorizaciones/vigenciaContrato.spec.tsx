import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { db } from "../../../src/data/db";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { hoyIso } from "../../../src/features/contratos/domain/contrato";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { CLIENTE, excavadora } from "../../support/fixtures";
import { renderRoute, signInAs } from "../../support/renderRoute";
import { contratoDatos } from "../contratos/fixtures";

// Las pantallas usan la fecha real: los contratos se arman alrededor de hoy.
function dentroDe(dias: number): string {
	return format(addDays(parseISO(hoyIso()), dias), "yyyy-MM-dd");
}

let vencidoId: string;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	signInAs();
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const contrato = async (proyecto: string, desde: number, hasta: number) => {
		const equipoId = (
			await equipoService.crear(
				excavadora(clienteId, { placa: `EXC-${proyecto.slice(0, 3)}` }),
				"ana@hm.pe",
			)
		).id;

		return (
			await contratoService.crear(
				contratoDatos(clienteId, equipoId, {
					proyecto,
					fechaInicio: dentroDe(desde),
					fechaFin: dentroDe(hasta),
				}),
				"ana@hm.pe",
			)
		).contrato.id;
	};
	await contrato("Vigente", -30, 60); // CTR-001
	await contrato("Por vencer", -30, 3); // CTR-002
	vencidoId = await contrato("Vencido", -90, -1); // CTR-003
	await contrato("Futuro", 10, 100); // CTR-004
});

test("solo ofrece contratos vigentes y avisa el que vence esta semana", async () => {
	const user = userEvent.setup();
	renderRoute("/valorizaciones/nueva");

	await user.click(await screen.findByLabelText(/Contrato/));
	const opciones = (await screen.findAllByRole("option")).map((opcion) => opcion.textContent);

	expect(opciones).toHaveLength(2);
	expect(opciones[0]).toMatch(/^CTR-001/);
	expect(opciones[1]).toMatch(/^CTR-002 .*· vence en 3 días$/);

	await user.click(screen.getByRole("option", { name: /CTR-002/ }));

	expect(await screen.findByRole("alert")).toHaveTextContent("Vence en 3 días: CTR-002");
});

test("el periodo solo deja elegir meses dentro de la vigencia del contrato", async () => {
	const user = userEvent.setup();
	renderRoute("/valorizaciones/nueva");
	const mes = (dias: number) => {
		const nombre = format(addDays(parseISO(hoyIso()), dias), "MMMM", { locale: es });

		return screen.findByRole("option", {
			name: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}`,
		});
	};

	await user.click(await screen.findByLabelText(/Contrato/));
	await user.click(await screen.findByRole("option", { name: /CTR-002/ }));
	await user.click(screen.getByLabelText(/Periodo/));

	expect(await mes(0)).not.toHaveAttribute("aria-disabled", "true");
	expect(await mes(-70)).toHaveAttribute("aria-disabled", "true");
});

test("un enlace a un contrato vencido no permite crear la valorización", async () => {
	const user = userEvent.setup();
	renderRoute(`/valorizaciones/nueva?contrato=${vencidoId}`);

	await user.click(await screen.findByRole("button", { name: "Continuar con la planilla" }));

	expect(screen.queryByText(/CTR-003/)).not.toBeInTheDocument();
	expect(await screen.findByText("Selecciona el contrato.")).toBeInTheDocument();
	expect(await db.valorizaciones.count()).toBe(0);
});

test("la lista de valorizaciones avisa los contratos que vencen esta semana", async () => {
	renderRoute("/valorizaciones");

	const aviso = await screen.findByRole("region", { name: "Contratos por vencer" });

	expect(aviso).toHaveTextContent("Un contrato vence esta semana");
	expect(within(aviso).getByRole("link", { name: "CTR-002 · POR VENCER" })).toHaveAttribute(
		"href",
		expect.stringContaining("/contratos/"),
	);
	expect(aviso).toHaveTextContent("vence en 3 días");
});
