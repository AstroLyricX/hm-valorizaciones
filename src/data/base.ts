import { z } from "zod";

// Campos comunes a todos los registros. Preparan la sincronización (version, updatedAt)
// y el borrado lógico (deletedAt) para la migración futura a un backend.
export const BaseSchema = z.object({
	id: z.string().min(1),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
	updatedBy: z.string().min(1),
	deletedAt: z.iso.datetime().nullable(),
	version: z.int().nonnegative(),
});

export type BaseFields = z.infer<typeof BaseSchema>;
