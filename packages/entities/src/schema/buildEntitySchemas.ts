/**
 * Builds the three schema variants per entity:
 * - schema: user + system fields (reads, post-write validation)
 * - createSchema: user fields only (POST)
 * - updateSchema: partial user fields (PUT/PATCH)
 */
import { z } from "zod";

import type { FieldTypeRegistry } from "../fieldTypes.js";
import { usesForeignKeyStorage } from "../relations/relationConfig.js";
import type {
  FieldConfig,
  FieldDefinitions,
  InferCreate,
  InferEntity,
  InferUpdate,
} from "../types.js";
import {
  buildFieldSchema,
  defaultFieldTypeRegistry,
} from "./buildFieldSchema.js";
import { isoDatetimeStringSchema } from "./isoDatetime.js";

const sharePermissionSchema = z.enum(["read", "write"]);

const systemFieldSchemas = {
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  ownerId: z.string().trim().min(1),
  createdBy: z.string().trim().min(1),
  updatedBy: z.string().trim().min(1),
  accessUserIds: z.array(z.string().trim().min(1)).min(1),
  sharedWith: z.record(z.string().trim().min(1), sharePermissionSchema),
  createdAt: isoDatetimeStringSchema,
  updatedAt: isoDatetimeStringSchema,
} as const;

function shouldIncludeFieldInSchema(fieldConfig: FieldConfig): boolean {
  if (fieldConfig.type !== "relation") {
    return true;
  }

  return usesForeignKeyStorage(fieldConfig.relation);
}

export interface EntitySchemas<TFields extends FieldDefinitions> {
  readonly schema: z.ZodType<InferEntity<TFields>>;
  readonly createSchema: z.ZodType<InferCreate<TFields>>;
  readonly updateSchema: z.ZodType<InferUpdate<TFields>>;
}

export function buildEntitySchemas<TFields extends FieldDefinitions>(
  fields: TFields,
  registry: FieldTypeRegistry = defaultFieldTypeRegistry,
): EntitySchemas<TFields> {
  const userFieldEntries = Object.entries(fields) as Array<
    [keyof TFields & string, TFields[keyof TFields]]
  >;

  const createShape: Record<string, z.ZodTypeAny> = {};
  const fullUserShape: Record<string, z.ZodTypeAny> = {};
  const updateShape: Record<string, z.ZodTypeAny> = {};

  for (const [fieldName, fieldConfig] of userFieldEntries) {
    if (!shouldIncludeFieldInSchema(fieldConfig)) {
      continue;
    }

    createShape[fieldName] = buildFieldSchema(fieldConfig, "create", registry);
    fullUserShape[fieldName] = buildFieldSchema(fieldConfig, "full", registry);
    updateShape[fieldName] = buildFieldSchema(
      fieldConfig,
      "full",
      registry,
    ).optional();
  }

  const createSchema = z.object(createShape).strict() as z.ZodType<
    InferCreate<TFields>
  >;

  const updateSchema = z.object(updateShape).strict() as z.ZodType<
    InferUpdate<TFields>
  >;

  const schema = z
    .object({
      ...fullUserShape,
      ...systemFieldSchemas,
    })
    .strict() as z.ZodType<InferEntity<TFields>>;

  return {
    schema,
    createSchema,
    updateSchema,
  };
}
