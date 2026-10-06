import { db } from "@/data/db";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";

import { ContratoRepository } from "../infrastructure/ContratoRepository";
import { ContratoService } from "./ContratoService";

export const contratoRepository = new ContratoRepository(db);
export const contratoService = new ContratoService(contratoRepository, terceroRepository);
