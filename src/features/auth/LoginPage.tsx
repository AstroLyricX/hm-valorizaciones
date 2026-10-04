import { Calculator, FileText, LoaderCircle, WifiOff } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

import { BrandArc } from "./BrandArc";
import { MicrosoftLogo } from "./MicrosoftLogo";
import { useSession } from "./useSession";

const FEATURES = [
	{ icon: WifiOff, text: "Trabaja en obra sin conexión; se sincroniza al volver la señal." },
	{ icon: Calculator, text: "Acumulados, saldos e IGV calculados automáticamente." },
	{ icon: FileText, text: "Valorizaciones en PDF listas para firmar y enviar." },
];

export function LoginPage() {
	const { user, isSigningIn, signIn } = useSession();
	const isOnline = useOnlineStatus();
	const navigate = useNavigate();
	const location = useLocation();
	const from = (location.state as { from?: string } | null)?.from ?? "/";

	if (user) {
		return <Navigate to={from} replace />;
	}

	const handleSignIn = async () => {
		await signIn();
		await navigate(from, { replace: true });
	};

	return (
		<div className="grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
			<aside className="relative isolate hidden overflow-hidden bg-linear-to-br from-[#1C7BC9] to-[#004A85] p-12 text-white lg:flex lg:flex-col lg:justify-between">
				<BrandArc className="absolute -right-24 -bottom-10 -z-10 w-[42rem] text-white/15" />
				<p className="text-sm font-medium tracking-[0.2em] text-white/80 uppercase">
					Maquinarias y Contratistas Generales H&amp;M
				</p>
				<div className="flex max-w-md flex-col gap-8">
					<h2 className="text-4xl leading-tight font-semibold">
						Valorización de equipos y canteras, del campo a la factura.
					</h2>
					<ul className="flex flex-col gap-4">
						{FEATURES.map(({ icon: Icon, text }) => (
							<li key={text} className="flex items-start gap-3 text-white/90">
								<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
									<Icon className="size-4" />
								</span>
								<span>{text}</span>
							</li>
						))}
					</ul>
				</div>
				<p className="text-sm text-white/70">RUC 20602629903 · Ollachea, Carabaya, Puno</p>
			</aside>

			<main className="flex flex-col">
				<div className="relative h-36 overflow-hidden bg-linear-to-br from-[#1C7BC9] to-[#004A85] px-4 pt-6 lg:hidden">
					<BrandArc className="absolute -right-12 -bottom-8 w-80 text-white/20" />
					<p className="relative text-center text-xs font-medium tracking-[0.2em] text-white/85 uppercase">
						H&amp;M E.I.R.L. · Maquinarias y Contratistas
					</p>
				</div>

				<div className="flex flex-1 items-start justify-center px-4 pb-10 lg:items-center lg:px-12">
					<div className="relative z-10 -mt-14 flex w-full max-w-sm flex-col gap-8 lg:mt-0">
						<div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
							<div className="rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5 lg:p-0 lg:shadow-none lg:ring-0">
								<img
									src="/logo-hm.png"
									alt="Maquinarias y Contratistas Generales H&M E.I.R.L."
									width={112}
									height={112}
									className="size-24 lg:size-28"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
								<p className="text-muted-foreground">
									Ingresa con tu cuenta de Microsoft de H&amp;M para gestionar contratos y
									valorizaciones.
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-3">
							<Button
								size="lg"
								variant="outline"
								className="h-12 w-full gap-3 text-base"
								disabled={isSigningIn || !isOnline}
								onClick={() => void handleSignIn()}
							>
								{isSigningIn ? (
									<LoaderCircle className="size-5 animate-spin" />
								) : (
									<MicrosoftLogo className="size-5" />
								)}
								{isSigningIn ? "Conectando…" : "Continuar con Microsoft"}
							</Button>

							<p
								role="status"
								className="flex items-start justify-center gap-2 text-sm text-muted-foreground lg:justify-start"
							>
								<span
									className={`mt-1.5 size-2 shrink-0 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}
								/>
								{isOnline
									? "Conectado"
									: "Sin conexión: el primer inicio de sesión necesita internet."}
							</p>
						</div>

						<p className="border-t pt-6 text-center text-sm text-muted-foreground lg:text-left">
							¿No puedes ingresar? Pide acceso al administrador de H&amp;M.
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
