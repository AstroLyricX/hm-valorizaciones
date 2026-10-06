import { db } from "@/data/db";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";
import { empresaService } from "@/features/configuracion/application/empresaService.instance";
import { contratoRepository } from "@/features/contratos/application/contratoService.instance";
import { equipoRepository } from "@/features/equipos/application/equipoService.instance";

import { ValorizacionRepository } from "../infrastructure/ValorizacionRepository";
import { ValorizacionService } from "./ValorizacionService";

export const valorizacionRepository = new ValorizacionRepository(db);
export const valorizacionService = new ValorizacionService(
	valorizacionRepository,
	contratoRepository,
	terceroRepository,
	equipoRepository,
	empresaService,
);
