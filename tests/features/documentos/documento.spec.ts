import {
	formatearTamano,
	MAX_BYTES,
	MAX_DOCUMENTOS,
	nombreSeguro,
	problemaArchivo,
	rutaDocumento,
	tipoDeArchivo,
} from "../../../src/features/documentos/domain/documento";

const pdf = (cambios: Partial<{ name: string; type: string; size: number }> = {}) => ({
	name: "Contrato firmado.pdf",
	type: "application/pdf",
	size: 250_000,
	...cambios,
});

describe("documentos adjuntos", () => {
	it("acepta PDF, imágenes, Word y Excel, también sin tipo informado", () => {
		expect(tipoDeArchivo(pdf())).toBe("application/pdf");
		expect(tipoDeArchivo(pdf({ name: "foto.JPG", type: "" }))).toBe("image/jpeg");
		expect(tipoDeArchivo(pdf({ name: "horas.xlsx", type: "" }))).toBe(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		expect(tipoDeArchivo(pdf({ name: "programa.exe", type: "application/x-msdownload" }))).toBe(
			null,
		);
	});

	it("explica por qué no se puede subir un archivo", () => {
		expect(problemaArchivo(pdf(), 0)).toBeNull();
		expect(problemaArchivo(pdf({ size: MAX_BYTES + 1 }), 0)).toBe(
			"«Contrato firmado.pdf» pesa 20 MB: el máximo es 20 MB.",
		);
		expect(problemaArchivo(pdf({ size: 0 }), 0)).toBe("«Contrato firmado.pdf» está vacío.");
		expect(problemaArchivo(pdf({ name: "virus.exe", type: "" }), 0)).toMatch(
			/solo PDF, imágenes \(JPG o PNG\), Word o Excel/,
		);
		expect(problemaArchivo(pdf(), MAX_DOCUMENTOS)).toBe(
			"Ya hay 20 documentos: quita alguno para subir otro.",
		);
	});

	it("deja el nombre listo para SharePoint y arma la ruta del archivo", () => {
		expect(nombreSeguro('Orden: 13/2025 "firmada"?.pdf')).toBe("Orden 13 2025 firmada.pdf");
		expect(nombreSeguro("  ..oculto.pdf ")).toBe("oculto.pdf");
		expect(
			rutaDocumento({ id: "d1", entidad: "contratos", registroId: "c1", nombre: "Contrato.pdf" }),
		).toBe("SistemaHM/archivos/contratos/c1/d1/Contrato.pdf");
	});

	it("muestra el tamaño en KB o MB", () => {
		expect(formatearTamano(250_000)).toBe("244 KB");
		expect(formatearTamano(3_500_000)).toBe("3.3 MB");
	});
});
