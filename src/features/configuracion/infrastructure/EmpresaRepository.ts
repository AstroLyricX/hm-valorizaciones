import type { HmDatabase } from "@/data/db";
import { ahoraIso } from "@/lib/fechas";

import { type Empresa, EMPRESA_ID, EmpresaSchema } from "../domain/empresa";

export class EmpresaRepository {
	constructor(private readonly database: HmDatabase) {}

	async obtener(): Promise<Empresa | undefined> {
		const empresa = await this.database.empresa.get(EMPRESA_ID);

		return empresa ? EmpresaSchema.parse(empresa) : undefined;
	}

	// Guarda el registro y deja el cambio en el outbox en la misma transacción.
	async guardar(empresa: Empresa): Promise<void> {
		const valida = EmpresaSchema.parse(empresa);

		await this.database.transaction("rw", this.database.empresa, this.database.outbox, async () => {
			await this.database.empresa.put(valida);
			await this.database.outbox.add({
				entidad: "empresa",
				registroId: valida.id,
				operacion: "upsert",
				payload: valida,
				createdAt: ahoraIso(),
				intentos: 0,
			});
		});
	}
}
