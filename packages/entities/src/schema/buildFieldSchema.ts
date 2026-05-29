import { z } from "zod";

import type { FieldSchemaBuilder } from "../fieldTypes.js";
import type { FieldConfig, RelationFieldConfig } from "../types.js";
import { usesForeignKeyStorage } from "../relations/relationConfig.js";
import { isoDatetimeStringSchema } from "./isoDatetime.js";

function applyDefault(schema: z.ZodTypeAny, config: FieldConfig): z.ZodTypeAny {
  if ("default" in config && config.default !== undefined) {
    return schema.default(config.default);
  }
  return schema;
}

function applyOptional(
  schema: z.ZodTypeAny,
  config: FieldConfig,
): z.ZodTypeAny {
  const hasDefault = "default" in config && config.default !== undefined;
  if (config.required === true && !hasDefault) {
    return schema;
  }
  return schema.optional();
}

const stringFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base =
      config.required === true ? z.string().trim().min(1) : z.string().trim();
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    const base =
      config.required === true ? z.string().trim().min(1) : z.string().trim();
    return applyDefault(base, config);
  },
};

const numberFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = z.number();
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(z.number(), config);
  },
};

const booleanFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = z.boolean();
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(z.boolean(), config);
  },
};

const dateFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = isoDatetimeStringSchema;
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(isoDatetimeStringSchema, config);
  },
};

function isForeignKeyRelationField(
  config: FieldConfig,
): config is RelationFieldConfig {
  return (
    config.type === "relation" && usesForeignKeyStorage(config.relation)
  );
}

const relationFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    if (!isForeignKeyRelationField(config)) {
      return z.never().optional();
    }

    const base = z.string().trim().min(1);
    return applyOptional(base, config);
  },
  buildFullFieldSchema(config) {
    if (!isForeignKeyRelationField(config)) {
      return z.never().optional();
    }

    const base = z.string().trim().min(1);
    if (config.required === true) {
      return base;
    }
    return base.optional();
  },
};

export const defaultFieldTypeRegistry = {
  string: stringFieldBuilder,
  number: numberFieldBuilder,
  boolean: booleanFieldBuilder,
  date: dateFieldBuilder,
  relation: relationFieldBuilder,
} as const satisfies Record<FieldConfig["type"], FieldSchemaBuilder>;

export function buildFieldSchema(
  config: FieldConfig,
  mode: "create" | "full",
  registry: Record<
    FieldConfig["type"],
    FieldSchemaBuilder
  > = defaultFieldTypeRegistry,
): z.ZodTypeAny {
  const builder = registry[config.type];
  if (mode === "create") {
    return builder.buildCreateFieldSchema(config);
  }

  const schema = builder.buildFullFieldSchema(config);
  const hasDefault = "default" in config && config.default !== undefined;
  if (config.required === true || hasDefault) {
    return schema;
  }
  return schema.optional();
}
