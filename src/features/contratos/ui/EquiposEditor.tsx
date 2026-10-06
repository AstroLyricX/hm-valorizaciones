import { ListPlus, Plus, Trash2 } from "lucide-react";
import {
	type Control,
	Controller,
	type FieldErrors,
	useFieldArray,
	type UseFormRegister,
	useWatch,
} from "react-hook-form";

import { Input } from "@/components/ui/input";
import { type Equipo, nombreEquipo } from "@/features/equipos/domain/equipo";
import { formatearMoneda } from "@/lib/dinero";
import { SelectField } from "@/shared/components/SelectField";

import {
	type ContratoDatos,
	type ContratoFormInput,
	EQUIPO_VACIO,
	parcialEnVivo,
} from "./contratoForm";

const celda = "border border-navy-100 px-2 py-2";

// Lista de equipos del contrato: equipo, horas mínimas y costo por hora (USD); el parcial y el
// monto contractual se calculan solos.
export function EquiposEditor({
	control,
	register,
	errors,
	equipos,
}: {
	control: Control<ContratoFormInput, unknown, ContratoDatos>;
	register: UseFormRegister<ContratoFormInput>;
	errors: FieldErrors<ContratoFormInput>;
	equipos: readonly Equipo[];
}) {
	const { fields, append, remove } = useFieldArray({ control, name: "equipos" });
	const filas = useWatch({ control, name: "equipos" });
	const parciales = filas.map((fila) => parcialEnVivo(fila));
	const total = parciales.reduce((suma, parcial) => suma + parcial, 0);
	const opciones = equipos.map((equipo) => ({
		value: equipo.id,
		label: `${equipo.activoFijo} · ${nombreEquipo(equipo)}`,
	}));

	return (
		<section aria-labelledby="equipos-contrato" className="flex flex-col gap-3 pt-5">
			<div className="flex items-center justify-between gap-3">
				<h3 id="equipos-contrato" className="text-sm font-semibold text-navy-800">
					Equipos del contrato
				</h3>
				<button
					type="button"
					onClick={() => append(EQUIPO_VACIO)}
					className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
				>
					<Plus className="size-4" aria-hidden="true" />
					Agregar equipo
				</button>
			</div>

			{fields.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-navy-100 px-6 py-10 text-center">
					<span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
						<ListPlus className="size-6" aria-hidden="true" />
					</span>
					<p className="max-w-sm text-sm text-muted-foreground">
						Agrega los equipos con el botón «Agregar equipo». Luego haz clic en «Guardar» para
						registrar el contrato.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-navy-100">
					<table className="w-full border-collapse text-sm">
						<thead className="bg-navy-50 text-xs text-navy-700">
							<tr>
								<th className={`${celda} w-10 text-center font-semibold`}>N.°</th>
								<th className={`${celda} min-w-56 text-left font-semibold`}>
									Equipo <span className="text-red-500">*</span>
								</th>
								<th className={`${celda} w-32 text-center font-semibold whitespace-nowrap`}>
									Horas mínimas <span className="text-red-500">*</span>
								</th>
								<th className={`${celda} w-40 text-center font-semibold whitespace-nowrap`}>
									Costo por hora (USD) <span className="text-red-500">*</span>
								</th>
								<th className={`${celda} w-32 text-right font-semibold`}>Parcial</th>
								<th className={`${celda} w-14 text-center font-semibold`}>Acción</th>
							</tr>
						</thead>
						<tbody>
							{fields.map((field, index) => {
								const error = errors.equipos?.[index];

								return (
									<tr key={field.id} aria-label={`Equipo ${index + 1}`} className="align-top">
										<td className={`${celda} pt-4 text-center text-navy-500 tabular-nums`}>
											{index + 1}
										</td>
										<td className={celda}>
											<Controller
												control={control}
												name={`equipos.${index}.equipoId`}
												render={({ field: campo }) => (
													<SelectField
														aria-label={`Equipo del ítem ${index + 1}`}
														aria-invalid={Boolean(error?.equipoId)}
														value={campo.value}
														onChange={campo.onChange}
														options={opciones}
														placeholder="Seleccionar equipo"
													/>
												)}
											/>
											{error?.equipoId && (
												<p className="mt-1 text-xs text-destructive">{error.equipoId.message}</p>
											)}
										</td>
										<td className={celda}>
											<Input
												{...register(`equipos.${index}.horasMinimas`)}
												aria-label={`Horas mínimas del ítem ${index + 1}`}
												aria-invalid={Boolean(error?.horasMinimas)}
												inputMode="decimal"
												placeholder="0"
												className="text-right tabular-nums"
											/>
											{error?.horasMinimas && (
												<p className="mt-1 text-xs text-destructive">
													{error.horasMinimas.message}
												</p>
											)}
										</td>
										<td className={celda}>
											<Input
												{...register(`equipos.${index}.costoHora`)}
												aria-label={`Costo por hora del ítem ${index + 1}`}
												aria-invalid={Boolean(error?.costoHora)}
												inputMode="decimal"
												placeholder="0.00"
												className="text-right tabular-nums"
											/>
											{error?.costoHora && (
												<p className="mt-1 text-xs text-destructive">{error.costoHora.message}</p>
											)}
										</td>
										<td
											className={`${celda} pt-4 text-right font-medium whitespace-nowrap text-navy-900 tabular-nums`}
										>
											<output aria-label={`Parcial del equipo ${index + 1}`}>
												{formatearMoneda(parciales[index] ?? 0, "USD")}
											</output>
										</td>
										<td className={`${celda} pt-3 text-center`}>
											<button
												type="button"
												aria-label={`Quitar equipo ${index + 1}`}
												onClick={() => remove(index)}
												className="inline-flex size-8 items-center justify-center rounded-md bg-red-600 text-white transition-colors hover:bg-red-700"
											>
												<Trash2 className="size-4" aria-hidden="true" />
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr className="bg-navy-50/70 font-semibold text-navy-900">
								<td className={celda} />
								<td colSpan={3} className={`${celda} text-left`}>
									Monto contractual
								</td>
								<td className={`${celda} text-right whitespace-nowrap tabular-nums`}>
									<output aria-label="Monto contractual">{formatearMoneda(total, "USD")}</output>
								</td>
								<td className={celda} />
							</tr>
						</tfoot>
					</table>
				</div>
			)}
			{errors.equipos?.root?.message && (
				<p className="text-sm text-destructive">{errors.equipos.root.message}</p>
			)}
			{errors.equipos?.message && (
				<p className="text-sm text-destructive">{errors.equipos.message}</p>
			)}
		</section>
	);
}
