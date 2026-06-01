import { z } from "zod";

export const ENTITY_CATEGORIES_COLLECTION = "entity_categories" as const;

export const ENTITY_CATEGORY_PERMISSIONS = [
  "entityCategory.read",
  "entityCategory.create",
  "entityCategory.update",
] as const;

export const entityCategoryRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  order: z.number().int(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type EntityCategoryRecord = z.infer<typeof entityCategoryRecordSchema>;

export const createEntityCategoryInputSchema = entityCategoryRecordSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateEntityCategoryInput = z.infer<
  typeof createEntityCategoryInputSchema
>;

export const patchEntityCategoryInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  icon: z.string().trim().min(1).optional(),
  order: z.number().int().optional(),
});

export type PatchEntityCategoryInput = z.infer<
  typeof patchEntityCategoryInputSchema
>;
