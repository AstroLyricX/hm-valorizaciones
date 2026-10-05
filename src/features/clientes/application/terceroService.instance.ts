import { db } from "@/data/db";

import { TerceroRepository } from "../infrastructure/TerceroRepository";
import { TerceroService } from "./TerceroService";

export const terceroRepository = new TerceroRepository(db);
export const terceroService = new TerceroService(terceroRepository);
