import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, FileSignature } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/useSession";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { estadoContrato, hoyIso } from "@/features/contratos/domain/contrato";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/EmptyState";
import { FormField } from "@/shared/components/FormField";
import { PageHeader } from "@/shared/components/PageHeader";
import { SelectField } from "@/shared/components/SelectField";

import { valorizacionService } from "./application/valorizacionService.instance";
import { NuevaValorizacionSchema } from "./domain/valorizacion";
import { PeriodoField } from "./ui/PeriodoField";

function periodoActual(): string {
	return hoyIso().slice(0, 7);
}

export function NuevaValorizacionPage() {
	const { user } = useSession();
	const navigate = useNavigate();
	const [parametros] = useSearchParams();
	const [contratoId, setContratoId] = useState(parametros.get("contrato") ?? "");
	const [periodo, setPeriodo] = useState(periodoActual);
	const [errores, setErrores] = useState<{ contratoId?: string; periodo?: string }>({});
	const [creando, setCreando] = useState(false);
	const opciones = useLiveQuery(async () => {
		const [contratos, terceros] = await Promise.all([
			contratoRepository.listar(),
			terceroRepository.listar("CLIENTE"),
		]);
		const nombres = new Map(terceros.map((tercero) => [tercero.id, tercero.razonSocial]));
		const hoy = hoyIso();

		return contratos
			.filter((contrato) => estadoContrato(contrato, hoy) === "ACTIVO")
			.map((contrato) => ({
				value: contrato.id,
				label: `${contrato.codigo} · ${contrato.proyecto} · ${nombres.get(contrato.terceroId) ?? "—"}`,
			}));
	});

	const crear = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const resultado = NuevaValorizacionSchema.safeParse({ contratoId, periodo });
		if (!resultado.success) {
			setErrores(
				Object.fromEntries(
					resultado.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
				),
			);

			return;
		}
		setCreando(true);
		try {
			const borrador = await valorizacionService.crearBorrador(
				resultado.data,
				user?.email ?? "desconocido",
			);
			void navigate(`/valorizaciones/${borrador.id}`);
		} catch {
			toast.error("No se pudo crear la valorización. Inténtalo de nuevo.");
			setCreando(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Nueva valorización"
				description="Elige el contrato y el periodo. Luego ingresas las horas de cada equipo."
			/>
			{opciones === undefined ? (
				<Skeleton aria-label="Cargando" className="h-56 w-full max-w-2xl rounded-xl" />
			) : opciones.length === 0 ? (
				<EmptyState
					icon={FileSignature}
					title="No hay contratos activos"
					description="La planilla de medición se genera a partir de los equipos de un contrato vigente."
				>
					<Link
						to="/contratos"
						className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3.5")}
					>
						Ir a contratos
					</Link>
				</EmptyState>
			) : (
				<form
					noValidate
					onSubmit={(event) => void crear(event)}
					className="flex max-w-2xl flex-col gap-5 rounded-xl border border-navy-100 bg-white p-5 shadow-[0_1px_3px_rgb(14_30_54/0.06)] md:p-6 dark:bg-card"
				>
					<FormField label="Contrato" required error={errores.contratoId}>
						{(campo) => (
							<SelectField
								{...campo}
								value={contratoId}
								onChange={(valor) => {
									setContratoId(valor);
									setErrores((actual) => ({ ...actual, contratoId: undefined }));
								}}
								options={opciones}
								placeholder="Seleccionar contrato"
							/>
						)}
					</FormField>
					<FormField
						label="Periodo"
						required
						error={errores.periodo}
						hint="Mes que se valoriza. Si ya hay un borrador de ese mes, se abre ese."
					>
						{(campo) => <PeriodoField {...campo} value={periodo} onChange={setPeriodo} />}
					</FormField>
					<div className="flex justify-end">
						<Button
							type="submit"
							disabled={creando}
							className="h-10 bg-brand-600 px-4 hover:bg-brand-700"
						>
							Continuar con la planilla
							<ArrowRight />
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
