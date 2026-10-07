// Descarga un archivo generado en el dispositivo (PDF, Excel…).
export function descargarArchivo(archivo: File): void {
	const url = URL.createObjectURL(archivo);
	const enlace = document.createElement("a");
	enlace.href = url;
	enlace.download = archivo.name;
	document.body.append(enlace);
	enlace.click();
	enlace.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
