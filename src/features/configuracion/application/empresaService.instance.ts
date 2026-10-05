import { db } from "@/data/db";

import { EmpresaRepository } from "../infrastructure/EmpresaRepository";
import { EmpresaService } from "./EmpresaService";

export const empresaRepository = new EmpresaRepository(db);
export const empresaService = new EmpresaService(empresaRepository);
