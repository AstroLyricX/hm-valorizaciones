import { MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { enlaceWhatsApp } from "@/shared/lib/whatsapp";

// Abre WhatsApp con el mensaje listo; si hay teléfono, directo en el chat de ese contacto.
export function CompartirWhatsApp({
	texto,
	telefono,
	className,
}: {
	texto: string;
	telefono?: string;
	className?: string;
}) {
	return (
		<a
			href={enlaceWhatsApp(texto, telefono)}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				buttonVariants({ variant: "outline" }),
				"h-9 border-emerald-200 px-3.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
				className,
			)}
		>
			<MessageCircle />
			WhatsApp
		</a>
	);
}
