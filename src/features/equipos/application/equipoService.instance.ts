import { db } from "@/data/db";

import { EquipoRepository } from "../infrastructure/EquipoRepository";
import { EquipoService } from "./EquipoService";

export const equipoRepository = new EquipoRepository(db);
export const equipoService = new EquipoService(equipoRepository);
