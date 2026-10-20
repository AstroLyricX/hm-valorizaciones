import { renderHook, waitFor } from "@testing-library/react";

import { db } from "../../../src/data/db";
import { PUBLICADO, usePublicarAvisos } from "../../../src/features/avisos/ui/usePublicarAvisos";
import { clienteService } from "../../../src/features/clientes/application/terceroService.instance";
import { contratoService } from "../../../src/features/contratos/application/contratoService.instance";
import { equipoService } from "../../../src/features/equipos/application/equipoService.instance";
import { CLIENTE, excavadora } from "../../support/fixtures";
import { contratoDatos } from "../contratos/fixtures";

const URL_WORKER = "https://hm-avisos.test";
let subir: jest.Mock;

beforeEach(async () => {
	localStorage.clear();
	await db.delete();
	await db.open();
	subir = jest.fn(async () => Promise.resolve(new Response(null, { status: 204 })));
	global.fetch = subir as typeof fetch;
	const clienteId = (await clienteService.crear(CLIENTE, "ana@hm.pe")).id;
	const equipoId = (await equipoService.crear(excavadora(clienteId), "ana@hm.pe")).id;
	// Vigente hasta 2099 para no depender de la fecha real.
	await contratoService.crear(
		contratoDatos(clienteId, equipoId, { fechaInicio: "2026-01-01", fechaFin: "2099-12-31" }),
		"ana@hm.pe",
	);
});

test("sube los contratos vigentes al Worker y no repite lo ya subido", async () => {
	const { unmount } = renderHook(() => {
		usePublicarAvisos(URL_WORKER);
	});

	await waitFor(
		() => {
			expect(subir).toHaveBeenCalledTimes(1);
		},
		{ timeout: 5000 },
	);
	const [url, opciones] = subir.mock.calls[0] as [string, RequestInit];
	expect(url).toBe(`${URL_WORKER}/contratos`);
	expect(opciones.method).toBe("PUT");
	expect(JSON.parse(String(opciones.body))).toMatchObject({
		contratos: [{ codigo: "CTR-001", fechaFin: "2099-12-31", pendiente: true }],
	});
	await waitFor(() => {
		expect(localStorage.getItem(PUBLICADO)).toBe(opciones.body);
	});
	unmount();

	renderHook(() => {
		usePublicarAvisos(URL_WORKER);
	});
	await new Promise((resolver) => {
		setTimeout(resolver, 3500);
	});

	expect(subir).toHaveBeenCalledTimes(1);
});

test("sin dirección del Worker no sube nada", async () => {
	renderHook(() => {
		usePublicarAvisos("");
	});
	await new Promise((resolver) => {
		setTimeout(resolver, 3500);
	});

	expect(subir).not.toHaveBeenCalled();
});
