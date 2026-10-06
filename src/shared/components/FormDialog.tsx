import { LoaderCircle, type LucideIcon, Plus, Save, X } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ANCHO = { md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" } as const;

// Ventana modal de formulario: cabecera con el azul del logo, cuerpo con scroll y pie con
// "Cancelar" (rojo suave) y "Guardar" (azul).
export function FormDialog({
	open,
	onOpenChange,
	title,
	description,
	onSubmit,
	submitLabel = "Guardar",
	isSubmitting = false,
	size = "md",
	icon: Icono = Plus,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	onSubmit: FormEventHandler<HTMLFormElement>;
	submitLabel?: string;
	isSubmitting?: boolean;
	size?: keyof typeof ANCHO;
	icon?: LucideIcon;
	children: ReactNode;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					"flex max-h-[92svh] w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-xl p-0 ring-0 shadow-2xl",
					ANCHO[size],
				)}
			>
				<div className="flex items-center gap-2 bg-brand-600 px-5 py-4 text-white">
					<Icono className="size-5 shrink-0" aria-hidden="true" />
					<DialogTitle className="flex-1 text-base font-semibold text-white">{title}</DialogTitle>
					<DialogClose
						aria-label="Cerrar"
						className="flex size-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
					>
						<X className="size-5" />
					</DialogClose>
				</div>
				{description && <DialogDescription className="sr-only">{description}</DialogDescription>}
				<form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
					<div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-4 sm:px-6">
						<DialogClose
							type="button"
							className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-50 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
						>
							<X className="size-4" aria-hidden="true" />
							Cancelar
						</DialogClose>
						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
						>
							{isSubmitting ? (
								<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
							) : (
								<Save className="size-4" aria-hidden="true" />
							)}
							{submitLabel}
						</button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
