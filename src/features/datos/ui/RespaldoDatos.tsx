import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { hoyIso } from "@/features/contratos/domain/contrato";
import { descargarArchivo } from "@/shared/lib/descargar";

import { datosExportacion, nombreArchivoExcel } from "../application/datosExportacion";
import { libroExcel } from "../domain/libroExcel";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Respaldo de todos los datos del dispositivo en un Excel con las mismas hojas que el xlsm.
export function RespaldoDatos() {
	const [exportando, setExportando] = useState(false);

	const exportar = async () => {
		setExportando(true);
		try {
			const [{ escribirExcel }, datos] = await Promise.all([
				import("../application/escribirExcel"),
				datosExportacion(),
			]);
			const nombre = nombreArchivoExcel(hoyIso());
			descargarArchivo(new File([escribirExcel(libroExcel(datos))], nombre, { type: TIPO_XLSX }));
			toast.success(`Se descargó ${nombre}.`);
		} catch (error) {
			console.error(error);
			toast.error("No se pudo exportar. Inténtalo de nuevo.");
		} finally {
			setExportando(false);
		}
	};

	return (
		<section
			aria-labelledby="respaldo"
			className="grid gap-5 rounded-xl border border-navy-100 bg-white px-5 py-6 shadow-[0_1px_3px_rgb(14_30_54/0.06)] md:grid-cols-[16rem_1fr] md:gap-8 md:px-6 dark:bg-card"
		>
			<div className="flex flex-col gap-1">
				<h2 id="respaldo" className="text-sm font-semibold text-navy-900">
					Respaldo en Excel
				</h2>
				<p className="text-[13px] text-muted-foreground">
					Descarga clientes, equipos, contratos y valorizaciones en un Excel, con las mismas hojas
					que el xlsm.
				</p>
			</div>
			<div className="flex flex-wrap items-start gap-3">
				<Button
					variant="outline"
					className="h-10 px-4"
					disabled={exportando}
					onClick={() => void exportar()}
				>
					{exportando ? <LoaderCircle className="animate-spin" /> : <FileSpreadsheet />}
					Exportar a Excel
				</Button>
			</div>
		</section>
	);
}
