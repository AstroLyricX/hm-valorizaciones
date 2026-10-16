import { db } from "@/data/db";
import { terceroRepository } from "@/features/clientes/application/terceroService.instance";

import { EquipoRepository } from "../infrastructure/EquipoRepository";
import { EquipoService } from "./EquipoService";

export const equipoRepository = new EquipoRepository(db);
export const equipoService = new EquipoService(equipoRepository, terceroRepository);
