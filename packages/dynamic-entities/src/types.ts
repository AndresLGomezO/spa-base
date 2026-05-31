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
});

export const fieldDefinitionSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.enum(["string", "number", "boolean", "date", "relation", "enum"]),
    required: z.boolean().optional(),
    relation: relationDefinitionSchema.optional(),
    enumValues: z.array(z.string().trim().min(1)).min(1).optional(),
    ui: z
      .object({
        label: z.string().optional(),
        component: z.string().optional(),
        placeholder: z.string().optional(),
        displayFormat: z.enum(["currency", "plain"]).optional(),
        dateDisplayFormat: z.enum(["date", "datetime", "time"]).optional(),
        order: z.number().int().nonnegative().optional(),
        filterable: z.boolean().optional(),
        sortable: z.boolean().optional(),
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
  ui: z.custom<EntityUIConfig>().optional(),
  tenantWideRead: z.boolean().optional(),
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
  ui: z.custom<EntityUIConfig>().optional(),
});

export type PatchEntityDefinitionInput = z.infer<
  typeof patchEntityDefinitionInputSchema
>;
