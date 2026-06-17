/**
 * @ai-context-sync
 * When changing entity definition or field schemas, run: pnpm generate:ai-context
 * Affected fragments: model.*
 */
import { z } from "zod";

import {
  imageFileReferenceSchema,
  isArrayEligibleFieldType,
  MAX_FILE_SIZE_BYTES_CAP,
  stripDownloadUrlFromFileReference,
  type EntityUIConfig,
} from "@repo/entities";

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
    type: z.enum([
      "string",
      "number",
      "boolean",
      "date",
      "relation",
      "enum",
      "image",
      "document",
    ]),
    required: z.boolean().optional(),
    isArray: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    relation: relationDefinitionSchema.optional(),
    enumValues: z.array(z.string().trim().min(1)).min(1).optional(),
    numberKind: z.enum(["integer", "decimal"]).optional(),
    maxSizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_FILE_SIZE_BYTES_CAP)
      .optional(),
    defaultImage: z.preprocess(
      (value) =>
        value === undefined || value === null
          ? undefined
          : stripDownloadUrlFromFileReference(value),
      imageFileReferenceSchema.optional(),
    ),
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
    if (
      (field.type === "image" || field.type === "document") &&
      field.sensitive
    ) {
      ctx.addIssue({
        code: "custom",
        message: "File fields cannot be marked as sensitive.",
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
    if (
      field.type !== "image" &&
      field.type !== "document" &&
      field.maxSizeBytes !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Only image and document fields may include maxSizeBytes.",
        path: ["maxSizeBytes"],
      });
    }
    if (field.type !== "image" && field.defaultImage !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Only image fields may include defaultImage.",
        path: ["defaultImage"],
      });
    }
    if (field.isArray === true && !isArrayEligibleFieldType(field.type)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Only string, number, boolean, date, and enum fields may be stored as arrays.",
        path: ["isArray"],
      });
    }
  });

const entityDefinitionRecordBaseSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-zA-Z0-9]*$/, "Name must be camelCase."),
  label: z.string().trim().min(1),
  description: z.string().trim().optional(),
  fields: z.array(fieldDefinitionSchema).min(1),
  tenantWideRead: z.boolean().optional(),
  inMemoryListQueries: z.boolean().optional(),
  hiddenFromNav: z.boolean().optional(),
  navCategoryId: z.string().trim().min(1).optional(),
  navOrder: z.number().int().optional(),
  displayField: z.string().trim().min(1).optional(),
  ui: z.custom<EntityUIConfig>().optional(),
  version: z.number().int().positive(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

type DisplayFieldValidationInput = {
  readonly displayField?: string;
  readonly fields: readonly z.infer<typeof fieldDefinitionSchema>[];
};

function refineEntityDefinitionDisplayField(
  record: DisplayFieldValidationInput,
  ctx: z.RefinementCtx,
): void {
  if (!record.displayField) {
    return;
  }

  const displayField = record.fields.find(
    (field) => field.name === record.displayField,
  );
  if (displayField?.isArray === true) {
    ctx.addIssue({
      code: "custom",
      message: "displayField cannot reference an array field.",
      path: ["displayField"],
    });
  }
}

export const entityDefinitionRecordSchema =
  entityDefinitionRecordBaseSchema.superRefine(
    refineEntityDefinitionDisplayField,
  );

export type FieldDefinitionRecord = z.infer<typeof fieldDefinitionSchema>;
export type EntityDefinitionRecord = z.infer<
  typeof entityDefinitionRecordSchema
>;

export const createEntityDefinitionInputSchema =
  entityDefinitionRecordBaseSchema
    .omit({
      id: true,
      tenantId: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    })
    .extend({
      tenantId: z.string().trim().min(1).optional(),
    })
    .superRefine(refineEntityDefinitionDisplayField);

export type CreateEntityDefinitionInput = z.infer<
  typeof createEntityDefinitionInputSchema
>;

export const patchEntityDefinitionInputSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    description: z.union([z.string().trim(), z.null()]).optional(),
    fields: z.array(fieldDefinitionSchema).min(1).optional(),
    tenantWideRead: z.boolean().optional(),
    inMemoryListQueries: z.boolean().optional(),
    hiddenFromNav: z.boolean().optional(),
    navCategoryId: z.union([z.string().trim().min(1), z.null()]).optional(),
    navOrder: z.union([z.number().int(), z.null()]).optional(),
    displayField: z.union([z.string().trim().min(1), z.null()]).optional(),
    ui: z.custom<EntityUIConfig>().optional(),
  })
  .superRefine((input, ctx) => {
    if (
      typeof input.displayField !== "string" ||
      input.displayField.length === 0 ||
      !input.fields
    ) {
      return;
    }

    refineEntityDefinitionDisplayField(
      {
        displayField: input.displayField,
        fields: input.fields,
      },
      ctx,
    );
  });

export type PatchEntityDefinitionInput = z.infer<
  typeof patchEntityDefinitionInputSchema
>;
