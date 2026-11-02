import { db } from "@/data/db";

import { DocumentoRepository } from "../infrastructure/DocumentoRepository";
import { DocumentoService } from "./DocumentoService";

export const documentoRepository = new DocumentoRepository(db);
export const documentoService = new DocumentoService(documentoRepository);
