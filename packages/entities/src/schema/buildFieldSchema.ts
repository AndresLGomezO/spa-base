import { z } from "zod";

import { fieldConfigIsArray } from "../array-field-eligibility.js";
import type { FieldSchemaBuilder } from "../fieldTypes.js";
import type { FieldConfig, RelationFieldConfig } from "../types.js";
import { usesForeignKeyStorage } from "../relations/relationConfig.js";
import {
  documentFileReferenceSchema,
  imageFileReferenceSchema,
} from "./entityFileReference.js";
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
  // Firestore and hooks commonly send null for unset optional fields.
  return schema.nullish();
}

function wrapAsArray(
  elementSchema: z.ZodTypeAny,
  config: FieldConfig,
): z.ZodTypeAny {
  if (!fieldConfigIsArray(config)) {
    return elementSchema;
  }

  const arraySchema = z.array(elementSchema);
  if (config.required === true) {
    return arraySchema.min(1);
  }
  return arraySchema;
}

function stringElementSchema(config: FieldConfig): z.ZodString {
  if (fieldConfigIsArray(config)) {
    return z.string().trim().min(1);
  }
  return config.required === true
    ? z.string().trim().min(1)
    : z.string().trim();
}

const stringFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = wrapAsArray(stringElementSchema(config), config);
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    const base = wrapAsArray(stringElementSchema(config), config);
    return applyDefault(base, config);
  },
};

function numberSchemaForConfig(config: FieldConfig): z.ZodNumber {
  if (config.type === "number" && config.numberKind === "integer") {
    return z.number().int();
  }
  return z.number();
}

const numberFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = wrapAsArray(numberSchemaForConfig(config), config);
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(
      wrapAsArray(numberSchemaForConfig(config), config),
      config,
    );
  },
};

const booleanFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = wrapAsArray(z.boolean(), config);
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(wrapAsArray(z.boolean(), config), config);
  },
};

const dateFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    const base = wrapAsArray(isoDatetimeStringSchema, config);
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    return applyDefault(wrapAsArray(isoDatetimeStringSchema, config), config);
  },
};

function isForeignKeyRelationField(
  config: FieldConfig,
): config is RelationFieldConfig {
  return config.type === "relation" && usesForeignKeyStorage(config.relation);
}

const relationFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    if (!isForeignKeyRelationField(config)) {
      return z.never().nullish();
    }

    const base = z.string().trim().min(1);
    return applyOptional(base, config);
  },
  buildFullFieldSchema(config) {
    if (!isForeignKeyRelationField(config)) {
      return z.never().nullish();
    }

    const base = z.string().trim().min(1);
    if (config.required === true) {
      return base;
    }
    return base.nullish();
  },
};

const enumFieldBuilder: FieldSchemaBuilder = {
  buildCreateFieldSchema(config) {
    if (config.type !== "enum") {
      return z.never().nullish();
    }
    const base = wrapAsArray(
      z.enum(config.enumValues as [string, ...string[]]),
      config,
    );
    return applyOptional(applyDefault(base, config), config);
  },
  buildFullFieldSchema(config) {
    if (config.type !== "enum") {
      return z.never().nullish();
    }
    const base = wrapAsArray(
      z.enum(config.enumValues as [string, ...string[]]),
      config,
    );
    return applyDefault(base, config);
  },
};

function fileFieldBuilder(schema: z.ZodTypeAny): FieldSchemaBuilder {
  return {
    buildCreateFieldSchema(config) {
      return applyOptional(wrapAsArray(schema, config), config);
    },
    buildFullFieldSchema(config) {
      const base = wrapAsArray(schema, config);
      if (config.required === true) {
        return base;
      }
      return base.nullish();
    },
  };
}

const imageFieldBuilder = fileFieldBuilder(imageFileReferenceSchema);
const documentFieldBuilder = fileFieldBuilder(documentFileReferenceSchema);

export const defaultFieldTypeRegistry = {
  string: stringFieldBuilder,
  number: numberFieldBuilder,
  boolean: booleanFieldBuilder,
  date: dateFieldBuilder,
  relation: relationFieldBuilder,
  enum: enumFieldBuilder,
  image: imageFieldBuilder,
  document: documentFieldBuilder,
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
  return schema.nullish();
}
