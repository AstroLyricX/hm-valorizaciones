import type { HmDatabase } from "@/data/db";
import { guardarConOutbox } from "@/data/outbox";

import { type Empresa, EMPRESA_ID, EmpresaSchema } from "../domain/empresa";

export class EmpresaRepository {
	constructor(private readonly database: HmDatabase) {}

	async obtener(): Promise<Empresa | undefined> {
		const empresa = await this.database.empresa.get(EMPRESA_ID);

		return empresa ? EmpresaSchema.parse(empresa) : undefined;
	}

	async guardar(empresa: Empresa): Promise<void> {
		await guardarConOutbox(
			this.database,
			this.database.empresa,
			"empresa",
			EmpresaSchema.parse(empresa),
		);
	}
}
