// Enlaces wa.me: abren WhatsApp (app o web) con el mensaje escrito; la persona solo lo envía.
// Gratis y sin cuenta de empresa ni servidor.

// Número en formato internacional sin "+": un celular peruano de 9 dígitos recibe el 51.
export function numeroWhatsApp(telefono: string): string | null {
	const digitos = telefono.replace(/\D/g, "");
	if (/^9\d{8}$/.test(digitos)) {
		return `51${digitos}`;
	}

	return /^\d{10,15}$/.test(digitos) && !digitos.startsWith("0") ? digitos : null;
}

// Sin número válido se abre WhatsApp para elegir el chat.
export function enlaceWhatsApp(texto: string, telefono = ""): string {
	const numero = numeroWhatsApp(telefono);

	return `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texto)}`;
}
