import { Calculator, FileText, LoaderCircle, WifiOff } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { entorno, ruta } from "@/app/entorno";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

import { BrandArc } from "./BrandArc";
import { MicrosoftLogo } from "./MicrosoftLogo";
import { useSession } from "./useSession";

const FEATURES = [
	{ icon: WifiOff, label: "Funciona sin conexión" },
	{ icon: Calculator, label: "Cálculos automáticos" },
	{ icon: FileText, label: "PDF listo para firmar" },
];

export function LoginPage() {
	const { user, isLoading, isSigningIn, signIn, destino, modo } = useSession();
	const isOnline = useOnlineStatus();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string } | null)?.from ?? destino ?? "/";

	if (user) {
		return <Navigate to={from} replace />;
	}

	// Con Microsoft la página se va al login y vuelve a /login; sin Client ID entra al instante.
	const handleSignIn = async () => {
		await signIn(from);
		if (modo === "prueba") {
			await navigate(from, { replace: true });
		}
	};

	return (
		<div className="relative isolate flex min-h-svh flex-col overflow-hidden bg-slate-50 dark:bg-background">
			<div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute -top-48 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
				<div className="absolute inset-0 bg-[radial-gradient(circle,var(--color-slate-300)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] bg-size-[22px_22px] opacity-60 dark:opacity-20" />
				<BrandArc className="absolute -bottom-24 left-1/2 w-[64rem] max-w-none -translate-x-1/2 text-primary/[0.07]" />
			</div>

			<main className="flex flex-1 items-center justify-center px-4 py-12">
				<div className="flex w-full max-w-[400px] flex-col items-center gap-8">
					<section className="w-full rounded-3xl border border-white bg-white p-8 shadow-[0_24px_64px_-24px] shadow-primary/25 ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-card/80">
						<div className="flex flex-col items-center gap-6 text-center">
							<img
								src={ruta("logo-hm.png")}
								alt="Maquinarias y Contratistas Generales H&M E.I.R.L."
								width={88}
								height={88}
								className="size-22 rounded-2xl dark:bg-white"
							/>
							<div className="flex flex-col gap-2">
								<h1 className="text-2xl font-semibold tracking-tight text-balance">
									Iniciar sesión
								</h1>
								<p className="text-sm text-balance text-muted-foreground">
									Ingresa con tu cuenta de H&amp;M
									{entorno.msalDominio && (
										<>
											{" "}
											<span className="font-medium whitespace-nowrap text-slate-700 dark:text-slate-200">
												(@{entorno.msalDominio.toLowerCase()})
											</span>
										</>
									)}
									.
								</p>
							</div>
						</div>

						<div className="mt-8 flex flex-col gap-4">
							<Button
								size="lg"
								variant="outline"
								className="h-12 w-full gap-3 rounded-xl bg-white text-[15px] font-medium shadow-xs transition-all hover:-translate-y-px hover:bg-white hover:shadow-md disabled:translate-y-0 dark:bg-background"
								disabled={isLoading || isSigningIn || !isOnline}
								onClick={() => void handleSignIn()}
							>
								{isSigningIn ? (
									<LoaderCircle className="size-5 animate-spin text-primary" />
								) : (
									<MicrosoftLogo className="size-5" />
								)}
								{isSigningIn ? "Conectando…" : "Continuar con Microsoft"}
							</Button>

							<p
								role="status"
								className={cn(
									"mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
									isOnline
										? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
										: "bg-amber-50 text-center text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
								)}
							>
								<span className="relative flex size-2 shrink-0">
									{isOnline && (
										<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
									)}
									<span
										className={cn(
											"relative inline-flex size-2 rounded-full",
											isOnline ? "bg-emerald-500" : "bg-amber-500",
										)}
									/>
								</span>
								{isOnline ? "Conectado" : "Sin conexión: el primer ingreso necesita internet"}
							</p>
						</div>

						<p className="mt-8 border-t border-slate-200/70 pt-6 text-center text-xs text-balance text-muted-foreground dark:border-white/10">
							Solo pueden entrar las cuentas de H&amp;M y las personas invitadas por la empresa. ¿No
							tienes acceso? Pídelo al administrador.
						</p>
						{modo === "prueba" && (
							<p className="mt-3 text-center text-xs font-medium text-amber-700">
								Modo de prueba: el login con Microsoft aún no está configurado.
							</p>
						)}
					</section>

					<ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:flex-nowrap sm:whitespace-nowrap">
						{FEATURES.map(({ icon: Icon, label }) => (
							<li key={label} className="inline-flex items-center gap-1.5">
								<Icon className="size-3.5 text-primary" aria-hidden="true" />
								{label}
							</li>
						))}
					</ul>
				</div>
			</main>

			<footer className="px-4 pb-6 text-center text-xs text-muted-foreground/80">
				© {new Date().getFullYear()} Maquinarias y Contratistas Generales H&amp;M E.I.R.L.
				<span className="hidden sm:inline"> · </span>
				<span className="block sm:inline">RUC 20602629903</span>
			</footer>
		</div>
	);
}
