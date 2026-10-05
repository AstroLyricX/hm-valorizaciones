import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
	Building2,
	ClipboardList,
	FileSignature,
	type LucideIcon,
	Truck,
	Wallet,
} from "lucide-react";
import { Link } from "react-router";

import { useSession } from "@/features/auth/useSession";
import { EmptyState } from "@/shared/components/EmptyState";
import { NuevaValorizacionButton } from "@/shared/components/NuevaValorizacionButton";
import { PageHeader } from "@/shared/components/PageHeader";

// Los indicadores se calculan con datos reales desde la fase 9.
const INDICADORES: { label: string; value: string; to: string; icon: LucideIcon; tone: string }[] =
	[
		{
			label: "Valorizado este mes",
			value: "USD 0.00",
			to: "/valorizaciones",
			icon: Wallet,
			tone: "bg-brand-50 text-brand-600",
		},
		{
			label: "Contratos activos",
			value: "0",
			to: "/contratos",
			icon: FileSignature,
			tone: "bg-indigo-50 text-indigo-600",
		},
		{
			label: "Equipos operativos",
			value: "0",
			to: "/equipos",
			icon: Truck,
			tone: "bg-emerald-50 text-emerald-600",
		},
		{
			label: "Clientes activos",
			value: "0",
			to: "/clientes",
			icon: Building2,
			tone: "bg-sky-50 text-sky-600",
		},
	];

const COLUMNAS = ["N.°", "Contrato", "Periodo", "Total", "Estado"];

export function InicioPage() {
	const { user } = useSession();
	const firstName = user?.name.split(" ")[0] ?? "";
	const fecha = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={`Hola, ${firstName}`}
				description={`Resumen de la operación al ${fecha}.`}
				actions={<NuevaValorizacionButton className="md:hidden" />}
			/>

			<section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
				{INDICADORES.map(({ label, value, to, icon: Icon, tone }) => (
					<Link
						key={label}
						to={to}
						className="flex flex-col gap-3 rounded-xl border border-navy-100 bg-white p-4 shadow-[0_1px_3px_rgb(14_30_54/0.06)] transition-shadow hover:shadow-md hover:shadow-navy-900/5 md:p-5 dark:bg-card"
					>
						<span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
							<Icon className="size-[18px]" aria-hidden="true" />
						</span>
						<span className="flex flex-col gap-0.5">
							<span className="text-xl font-semibold tracking-tight text-navy-900 tabular-nums md:text-2xl dark:text-white">
								{value}
							</span>
							<span className="text-[13px] text-muted-foreground">{label}</span>
						</span>
					</Link>
				))}
			</section>

			<section
				aria-labelledby="recientes"
				className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_1px_3px_rgb(14_30_54/0.06)] dark:bg-card"
			>
				<div className="flex items-center justify-between border-b border-navy-100 px-4 py-3.5 md:px-5">
					<h2 id="recientes" className="text-sm font-semibold text-navy-900 dark:text-white">
						Valorizaciones recientes
					</h2>
					<Link to="/valorizaciones" className="text-sm font-medium text-brand-600 hover:underline">
						Ver todas
					</Link>
				</div>
				<div className="hidden grid-cols-5 border-b border-navy-100 bg-navy-50 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
					{COLUMNAS.map((columna) => (
						<span key={columna}>{columna}</span>
					))}
				</div>
				<EmptyState
					icon={ClipboardList}
					title="Sin valorizaciones"
					description="Las valorizaciones que emitas aparecerán aquí con su número, periodo y monto."
					className="rounded-none border-0"
				/>
			</section>
		</div>
	);
}
