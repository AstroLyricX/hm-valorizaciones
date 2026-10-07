import { Download, LoaderCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ruta } from "@/app/entorno";
import { Button } from "@/components/ui/button";
import { descargarArchivo } from "@/shared/lib/descargar";

import { type DatosPdf, nombreArchivoPdf } from "../pdf/datosPdf";

const LOGO = ruta("logo-hm.png");

function puedeCompartirArchivos(): boolean {
	try {
		const prueba = new File([""], "prueba.pdf", { type: "application/pdf" });

		return typeof navigator.canShare === "function" && navigator.canShare({ files: [prueba] });
	} catch {
		return false;
	}
}

async function crearArchivo(datos: Omit<DatosPdf, "logo">): Promise<File> {
	const { generarPdf } = await import("../pdf/generarPdf");
	const blob = await generarPdf({ ...datos, logo: LOGO });

	return new File([blob], nombreArchivoPdf(datos.planilla), { type: "application/pdf" });
}

// "Descargar PDF" en todos los dispositivos y "Compartir" donde el navegador lo permite
// (celulares: WhatsApp, correo…). Un borrador sale con la marca de agua BORRADOR.
export function AccionesPdf({ datos }: { datos: Omit<DatosPdf, "logo"> }) {
	const [generando, setGenerando] = useState<"descargar" | "compartir" | null>(null);
	const compartible = puedeCompartirArchivos();

	const ejecutar = async (accion: "descargar" | "compartir") => {
		setGenerando(accion);
		try {
			const archivo = await crearArchivo(datos);
			if (accion === "compartir") {
				await navigator.share({ files: [archivo], title: archivo.name });
			} else {
				descargarArchivo(archivo);
				toast.success(`Se descargó ${archivo.name}.`);
			}
		} catch (error) {
			// Cerrar el menú de compartir no es un error.
			if (!(error instanceof DOMException && error.name === "AbortError")) {
				console.error(error);
				toast.error("No se pudo generar el PDF. Inténtalo de nuevo.");
			}
		} finally {
			setGenerando(null);
		}
	};

	return (
		<>
			<Button
				variant="outline"
				className="h-9 px-3.5"
				disabled={generando !== null}
				onClick={() => void ejecutar("descargar")}
			>
				{generando === "descargar" ? <LoaderCircle className="animate-spin" /> : <Download />}
				Descargar PDF
			</Button>
			{compartible && (
				<Button
					variant="outline"
					className="h-9 px-3.5"
					disabled={generando !== null}
					onClick={() => void ejecutar("compartir")}
				>
					{generando === "compartir" ? <LoaderCircle className="animate-spin" /> : <Share2 />}
					Compartir
				</Button>
			)}
		</>
	);
}
