import { entorno } from "@/app/entorno";
import { db } from "@/data/db";

import { TerceroRepository } from "../infrastructure/TerceroRepository";
import { RucService } from "./RucService";
import { TerceroService } from "./TerceroService";

export const terceroRepository = new TerceroRepository(db);
export const terceroService = new TerceroService(terceroRepository);

export const rucService = new RucService(db, entorno.rucApiUrl);
