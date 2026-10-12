import {
	ConflictoError,
	GraphClient,
	GraphError,
	LIMITE_SUBIDA_SIMPLE,
	SinConexionError,
} from "../../../src/data/sync/graphClient";

function respuesta(status: number, cuerpo: unknown = {}, headers: Record<string, string> = {}) {
	return new Response(status === 204 ? null : JSON.stringify(cuerpo), {
		status,
		headers: { "Content-Type": "application/json", ...headers },
	});
}

function cliente(respuestas: (Response | Error)[]) {
	const llamadas: { url: string; init: RequestInit }[] = [];
	const esperas: number[] = [];
	const fetchSimulado = jest.fn(async (url: string, init: RequestInit) => {
		llamadas.push({ url, init });
		const siguiente = respuestas.shift();
		if (siguiente instanceof Error) {
			throw siguiente;
		}

		return Promise.resolve(siguiente ?? respuesta(500));
	});
	const graph = new GraphClient({
		obtenerToken: async () => Promise.resolve("token-123"),
		fetch: fetchSimulado as unknown as typeof fetch,
		esperar: async (ms) => {
			esperas.push(ms);
			await Promise.resolve();
		},
	});

	return { graph, llamadas, esperas };
}

describe("GraphClient", () => {
	it("escribe un JSON con el token y el eTag esperado", async () => {
		const { graph, llamadas } = cliente([respuesta(200, { id: "i1", name: "x.json", eTag: "e2" })]);

		const elemento = await graph.escribirJson(
			"d1",
			"SistemaHM/terceros/a b.json",
			{ a: 1 },
			{ eTag: "e1" },
		);

		expect(elemento.eTag).toBe("e2");
		expect(llamadas[0].url).toBe(
			"https://graph.microsoft.com/v1.0/drives/d1/root:/SistemaHM/terceros/a%20b.json:/content",
		);
		expect(llamadas[0].init.method).toBe("PUT");
		expect(llamadas[0].init.headers).toMatchObject({
			Authorization: "Bearer token-123",
			"If-Match": "e1",
		});
		expect(llamadas[0].init.body).toBe('{"a":1}');
	});

	it("al crear pide que el archivo no exista todavía", async () => {
		const { graph, llamadas } = cliente([respuesta(201, { id: "i1", name: "x.json", eTag: "e1" })]);

		await graph.escribirJson("d1", "SistemaHM/terceros/1.json", {}, "nuevo");

		expect(llamadas[0].init.headers).toMatchObject({ "If-None-Match": "*" });
	});

	it("reintenta ante 429 y 503 respetando Retry-After", async () => {
		const { graph, llamadas, esperas } = cliente([
			respuesta(429, {}, { "Retry-After": "3" }),
			respuesta(503),
			respuesta(200, { id: "sitio" }),
			respuesta(200, { id: "drive-1" }),
		]);

		expect(await graph.driveDelSitio("hm.sharepoint.com:/sites/SistemaHM")).toBe("drive-1");
		expect(esperas).toEqual([3000, 2000]);
		expect(llamadas).toHaveLength(4);
	});

	it("deja de reintentar tras 4 intentos", async () => {
		const { graph } = cliente([respuesta(503), respuesta(503), respuesta(503), respuesta(503)]);

		await expect(graph.driveDelSitio("x")).rejects.toMatchObject({ status: 503 });
	});

	it("convierte 412 en conflicto, un fallo de red en sin conexión y otros códigos en error", async () => {
		await expect(
			cliente([respuesta(412)]).graph.escribirJson("d", "a.json", {}, { eTag: "e" }),
		).rejects.toBeInstanceOf(ConflictoError);
		await expect(
			cliente([new TypeError("Failed to fetch")]).graph.escribirJson("d", "a.json", {}),
		).rejects.toBeInstanceOf(SinConexionError);
		await expect(
			cliente([respuesta(403)]).graph.escribirJson("d", "a.json", {}),
		).rejects.toBeInstanceOf(GraphError);
	});

	it("recorre las páginas de delta hasta el deltaLink", async () => {
		const { graph, llamadas } = cliente([
			respuesta(200, {
				value: [{ id: "1", name: "a.json" }],
				"@odata.nextLink": "https://graph/next",
			}),
			respuesta(200, {
				value: [{ id: "2", name: "b.json" }],
				"@odata.deltaLink": "https://graph/delta?t=9",
			}),
		]);

		const pagina = await graph.delta("d1");

		expect(pagina.elementos.map((elemento) => elemento.id)).toEqual(["1", "2"]);
		expect(pagina.deltaLink).toBe("https://graph/delta?t=9");
		// En SharePoint /delta solo existe en la raíz del drive.
		expect(llamadas[0].url).toBe("https://graph.microsoft.com/v1.0/drives/d1/root/delta");
		expect(llamadas[1].url).toBe("https://graph/next");
	});

	it("sube un PDF pequeño en una sola solicitud y uno grande por partes", async () => {
		const pequeno = cliente([respuesta(201, { id: "p1", name: "VAL.pdf" })]);
		await pequeno.graph.subirArchivo(
			"d1",
			"SistemaHM/pdf/2026/VAL.pdf",
			new Blob(["%PDF"], { type: "application/pdf" }),
		);
		expect(pequeno.llamadas[0].url).toContain("/root:/SistemaHM/pdf/2026/VAL.pdf:/content");

		const tamano = LIMITE_SUBIDA_SIMPLE + 10;
		const grande = cliente([
			respuesta(200, { uploadUrl: "https://upload.sharepoint/sesion" }),
			respuesta(202, {}),
			respuesta(201, { id: "p2", name: "VAL.pdf" }),
		]);
		const elemento = await grande.graph.subirArchivo(
			"d1",
			"SistemaHM/pdf/2026/VAL.pdf",
			new Blob([new Uint8Array(tamano)]),
		);

		expect(elemento.id).toBe("p2");
		expect(grande.llamadas[0].url).toContain(":/createUploadSession");
		expect(grande.llamadas[1].init.headers).toMatchObject({
			"Content-Range": `bytes 0-${320 * 1024 * 10 - 1}/${tamano}`,
		});
		// La sesión de subida no lleva el token.
		expect(grande.llamadas[1].init.headers).not.toHaveProperty("Authorization");
		expect(grande.llamadas[2].init.headers).toMatchObject({
			"Content-Range": `bytes ${320 * 1024 * 10}-${tamano - 1}/${tamano}`,
		});
	});
});
