import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/useSession";

export function InicioPage() {
	const { user, signOut } = useSession();

	return (
		<main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-4 py-10">
			<header className="flex flex-col gap-2">
				<img
					src="/logo-hm.png"
					alt="Maquinarias y Contratistas Generales H&M E.I.R.L."
					width={96}
					height={96}
					className="size-24"
				/>
				<h1 className="text-3xl font-semibold tracking-tight">Valorizaciones H&amp;M</h1>
				<p className="text-muted-foreground">
					Hola, {user?.name}. Gestión de equipos, contratos y valorizaciones.
				</p>
			</header>
			<div className="flex flex-wrap gap-3">
				<Button>Nueva valorización</Button>
				<Button variant="outline" onClick={signOut}>
					Cerrar sesión
				</Button>
			</div>
		</main>
	);
}
