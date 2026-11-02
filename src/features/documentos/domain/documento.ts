import { z } from "zod";

import { BaseSchema } from "@/data/base";

// Registros que pueden tener documentos adjuntos.
export const ENTIDADES_DOCUMENTO = ["equipos", "contratos", "valorizaciones"] as const;
export type EntidadDocumento = (typeof ENTIDADES_DOCUMENTO)[number];

// Tope por archivo y por registro: alcanza para un contrato escaneado de varias páginas y evita
// llenar el dispositivo y SharePoint.
export const MAX_MB = 20;
export const MAX_BYTES = MAX_MB * 1024 * 1024;
export const MAX_DOCUMENTOS = 20;

// Casi siempre PDF; también fotos, Word y Excel. La extensión cubre los navegadores que no
// informan el tipo del archivo.
const TIPOS: Partial<Record<string, { extensiones: string[]; formato: string }>> = {
	"application/pdf": { extensiones: ["pdf"], formato: "PDF" },
	"image/jpeg": { extensiones: ["jpg", "jpeg"], formato: "Imagen" },
	"image/png": { extensiones: ["png"], formato: "Imagen" },
	"application/msword": { extensiones: ["doc"], formato: "Word" },
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
		extensiones: ["docx"],
		formato: "Word",
	},
	"application/vnd.ms-excel": { extensiones: ["xls"], formato: "Excel" },
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
		extensiones: ["xlsx"],
		formato: "Excel",
	},
};

// Para el selector de archivos del navegador.
export const ACEPTA = Object.entries(TIPOS)
	.flatMap(([tipo, datos]) => [tipo, ...(datos?.extensiones ?? []).map((ext) => `.${ext}`)])
	.join(",");

export type FormatoDocumento = "PDF" | "Imagen" | "Word" | "Excel";

export const DocumentoSchema = BaseSchema.extend({
	entidad: z.enum(ENTIDADES_DOCUMENTO),
	registroId: z.string().min(1),
	// Nombre del archivo tal como se subió (sin caracteres que SharePoint no acepta).
	nombre: z.string().min(1).max(150),
	tipo: z.string().min(1),
	tamano: z.int().positive().max(MAX_BYTES),
	// Ruta del archivo en SharePoint.
	ruta: z.string().min(1),
	subidoPor: z.string().min(1),
});

export type Documento = z.infer<typeof DocumentoSchema>;

function extension(nombre: string): string {
	return nombre.includes(".") ? (nombre.split(".").at(-1) ?? "").toLowerCase() : "";
}

// Tipo MIME del archivo; si el navegador no lo informa, se deduce de la extensión.
export function tipoDeArchivo(archivo: Pick<File, "name" | "type">): string | null {
	if (archivo.type in TIPOS) {
		return archivo.type;
	}
	const ext = extension(archivo.name);
	const encontrado = Object.entries(TIPOS).find(([, datos]) => datos?.extensiones.includes(ext));

	return encontrado?.[0] ?? null;
}

export function formatoDocumento(tipo: string): FormatoDocumento {
	return (TIPOS[tipo]?.formato ?? "PDF") as FormatoDocumento;
}

export function formatearTamano(bytes: number): string {
	if (bytes < 1024 * 1024) {
		return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	}

	return `${(bytes / 1024 / 1024).toLocaleString("es-PE", { maximumFractionDigits: 1 })} MB`;
}

// Motivo por el que el archivo no se puede subir, o null si está bien.
export function problemaArchivo(
	archivo: Pick<File, "name" | "type" | "size">,
	yaAdjuntos: number,
): string | null {
	if (yaAdjuntos >= MAX_DOCUMENTOS) {
		return `Ya hay ${MAX_DOCUMENTOS} documentos: quita alguno para subir otro.`;
	}
	if (tipoDeArchivo(archivo) === null) {
		return `«${archivo.name}» no se puede subir: solo PDF, imágenes (JPG o PNG), Word o Excel.`;
	}
	if (archivo.size === 0) {
		return `«${archivo.name}» está vacío.`;
	}
	if (archivo.size > MAX_BYTES) {
		return `«${archivo.name}» pesa ${formatearTamano(archivo.size)}: el máximo es ${MAX_MB} MB.`;
	}

	return null;
}

// Nombre válido en SharePoint: sin " * : < > ? / \ | # % ni espacios al inicio o al final.
export function nombreSeguro(nombre: string): string {
	const limpio = nombre
		.split("")
		.map((caracter) =>
			caracter.charCodeAt(0) < 32 || '"*:<>?/\\|#%'.includes(caracter) ? " " : caracter,
		)
		.join("")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^\.+/, "");
	const ext = extension(limpio);
	const base = ext ? limpio.slice(0, -(ext.length + 1)) : limpio;
	const recortado = base.slice(0, 140 - ext.length).trim() || "documento";

	return ext ? `${recortado}.${ext}` : recortado;
}

// SistemaHM/archivos/contratos/<id del contrato>/<id del documento>/<nombre>.
export function rutaDocumento(
	documento: Pick<Documento, "id" | "entidad" | "registroId" | "nombre">,
): string {
	return `SistemaHM/archivos/${documento.entidad}/${documento.registroId}/${documento.id}/${documento.nombre}`;
}
