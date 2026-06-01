import { z } from "zod";

import type { EntityUIConfig } from "@repo/entities";

export const ENTITY_DEFINITIONS_COLLECTION = "entity_definitions" as const;

export const ENTITY_DEFINITION_PERMISSIONS = [
  "entityDefinition.read",
  "entityDefinition.create",
  "entityDefinition.update",
] as const;

export const relationDefinitionSchema = z.object({
  target: z.string().trim().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-one", "many-to-many"]),
  onDelete: z.enum(["restrict", "cascade", "nullify"]).optional(),
});

export const fieldDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.enum(["string", "number", "boolean", "date", "relation", "enum"]),
    required: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    relation: relationDefinitionSchema.optional(),
    enumValues: z.array(z.string().trim().min(1)).min(1).optional(),
    numberKind: z.enum(["integer", "decimal"]).optional(),
    ui: z
      .object({
        label: z.string().optional(),
        component: z.string().optional(),
        placeholder: z.string().optional(),
        displayFormat: z.enum(["currency", "plain", "percentage"]).optional(),
        dateDisplayFormat: z.enum(["date", "datetime", "time"]).optional(),
        order: z.number().int().nonnegative().optional(),
        filterable: z.boolean().optional(),
        sortable: z.boolean().optional(),
        searchable: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "relation" && !field.relation) {
      ctx.addIssue({
        code: "custom",
        message: "Relation fields require a relation config.",
        path: ["relation"],
      });
    }
    if (field.type === "enum" && !field.enumValues?.length) {
      ctx.addIssue({
        code: "custom",
        message: "Enum fields require enumValues.",
        path: ["enumValues"],
      });
    }
    if (field.type !== "relation" && field.relation) {
      ctx.addIssue({
        code: "custom",
        message: "Only relation fields may include relation config.",
        path: ["relation"],
      });
    }
    if (field.type !== "enum" && field.enumValues) {
      ctx.addIssue({
        code: "custom",
        message: "Only enum fields may include enumValues.",
        path: ["enumValues"],
      });
    }
    if (field.type === "relation" && field.sensitive) {
      ctx.addIssue({
        code: "custom",
        message: "Relation fields cannot be marked as sensitive.",
        path: ["sensitive"],
      });
    }
    if (field.type !== "number" && field.numberKind !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Only number fields may include numberKind.",
        path: ["numberKind"],
      });
    }
  });

export const entityDefinitionRecordSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-zA-Z0-9]*$/, "Name must be camelCase."),
  label: z.string().trim().min(1),
  fields: z.array(fieldDefinitionSchema).min(1),
  tenantWideRead: z.boolean().optional(),
  hiddenFromNav: z.boolean().optional(),
  navCategoryId: z.string().trim().min(1).optional(),
  navOrder: z.number().int().optional(),
  displayField: z.string().trim().min(1).optional(),
  ui: z.custom<EntityUIConfig>().optional(),
  version: z.number().int().positive(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export type FieldDefinitionRecord = z.infer<typeof fieldDefinitionSchema>;
export type EntityDefinitionRecord = z.infer<
  typeof entityDefinitionRecordSchema
>;

export const createEntityDefinitionInputSchema = entityDefinitionRecordSchema
  .omit({
    id: true,
    tenantId: true,
    version: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tenantId: z.string().trim().min(1).optional(),
  });

export type CreateEntityDefinitionInput = z.infer<
  typeof createEntityDefinitionInputSchema
>;

export const patchEntityDefinitionInputSchema = z.object({
  label: z.string().trim().min(1).optional(),
  fields: z.array(fieldDefinitionSchema).min(1).optional(),
  tenantWideRead: z.boolean().optional(),
  hiddenFromNav: z.boolean().optional(),
  navCategoryId: z.union([z.string().trim().min(1), z.null()]).optional(),
  navOrder: z.union([z.number().int(), z.null()]).optional(),
  displayField: z.union([z.string().trim().min(1), z.null()]).optional(),
  ui: z.custom<EntityUIConfig>().optional(),
});

export type PatchEntityDefinitionInput = z.infer<
  typeof patchEntityDefinitionInputSchema
>;
