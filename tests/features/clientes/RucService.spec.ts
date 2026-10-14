import { HmDatabase } from "../../../src/data/db";
import { RucService } from "../../../src/features/clientes/application/RucService";

const RUC = "20602629903";
const DATOS = {
	ruc: RUC,
	razonSocial: "MAQUINARIAS Y CONTRATISTAS GENERALES H & M E.I.R.L.",
	estado: "ACTIVO",
	condicion: "HABIDO",
	direccion: "AV. CIRCUNVALACION S/N - OLLACHEA - CARABAYA - PUNO",
};

let database: HmDatabase;

function worker(status = 200, cuerpo: unknown = DATOS) {
	return jest.fn(async () => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })));
}

function conexion(valor: boolean) {
	Object.defineProperty(navigator, "onLine", { configurable: true, value: valor });
}

beforeEach(() => {
	database = new HmDatabase(`test-${crypto.randomUUID()}`);
	conexion(true);
});

afterEach(async () => {
	await database.delete();
	conexion(true);
});

describe("RucService", () => {
	it("valida el RUC antes de consultar", async () => {
		const simulado = worker();
		const service = new RucService(database, "https://ruc.test", simulado);

		expect(await service.consultar("20123456789")).toEqual({ tipo: "invalido" });
		expect(simulado).not.toHaveBeenCalled();
	});

	it("consulta el Worker y guarda el resultado en la caché local", async () => {
		const simulado = worker();
		const service = new RucService(database, "https://ruc.test/", simulado);

		expect(await service.consultar(RUC)).toEqual({
			tipo: "encontrado",
			datos: DATOS,
			desde: "sunat",
		});
		expect(simulado).toHaveBeenCalledWith(`https://ruc.test/ruc/${RUC}`, expect.anything());
		expect(await database.rucConsultados.get(RUC)).toMatchObject(DATOS);
	});

	it("la segunda vez responde desde la caché, también sin conexión", async () => {
		const simulado = worker();
		const service = new RucService(database, "https://ruc.test", simulado);
		await service.consultar(RUC);

		expect(await service.consultar(RUC)).toMatchObject({ tipo: "encontrado", desde: "cache" });
		conexion(false);
		expect(await service.consultar(RUC)).toMatchObject({ tipo: "encontrado", desde: "cache" });
		expect(simulado).toHaveBeenCalledTimes(1);
	});

	it("pasado un mes vuelve a consultar SUNAT", async () => {
		const simulado = worker();
		let ahora = new Date("2026-10-01T10:00:00Z");
		const service = new RucService(database, "https://ruc.test", simulado, () => ahora);
		await database.rucConsultados.put({ ...DATOS, consultadoEn: "2026-08-15T10:00:00.000Z" });

		expect(await service.consultar(RUC)).toMatchObject({ desde: "sunat" });
		ahora = new Date("2026-10-02T10:00:00Z");
		expect(await service.consultar(RUC)).toMatchObject({ desde: "cache" });
	});

	it("si no está en SUNAT o el servicio falla, permite la carga manual", async () => {
		expect(
			await new RucService(database, "https://ruc.test", worker(404, {})).consultar(RUC),
		).toEqual({
			tipo: "no-encontrado",
		});
		expect(
			await new RucService(database, "https://ruc.test", worker(502, {})).consultar(RUC),
		).toEqual({
			tipo: "no-disponible",
		});
		const caido = jest.fn(async () => Promise.reject(new TypeError("Failed to fetch")));
		expect(await new RucService(database, "https://ruc.test", caido).consultar(RUC)).toEqual({
			tipo: "no-disponible",
		});
	});

	it("sin Worker configurado o sin conexión no consulta", async () => {
		const simulado = worker();
		expect(new RucService(database, "", simulado).disponible).toBe(false);
		expect(await new RucService(database, "", simulado).consultar(RUC)).toEqual({
			tipo: "no-disponible",
		});
		conexion(false);
		expect(await new RucService(database, "https://ruc.test", simulado).consultar(RUC)).toEqual({
			tipo: "no-disponible",
		});
		expect(simulado).not.toHaveBeenCalled();
	});
});
