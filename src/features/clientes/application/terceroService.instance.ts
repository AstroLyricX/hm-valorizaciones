import { entorno } from "@/app/entorno";
import { db } from "@/data/db";

import type { TipoTercero } from "../domain/tercero";
import { TerceroRepository } from "../infrastructure/TerceroRepository";
import { RucService } from "./RucService";
import { TerceroService } from "./TerceroService";

export const terceroRepository = new TerceroRepository(db);
export const clienteService = new TerceroService(terceroRepository, "CLIENTE");
export const proveedorService = new TerceroService(terceroRepository, "PROVEEDOR");

export function servicioDe(tipo: TipoTercero): TerceroService {
	return tipo === "CLIENTE" ? clienteService : proveedorService;
}

export const rucService = new RucService(db, entorno.rucApiUrl);
