import type {
  FieldConfig,
  FieldDefinitions,
  NormalizedFieldMeta,
  RelationConfig,
} from "../types.js";
import { getRelationOnDelete } from "../relations/relationConfig.js";

export function normalizeFieldMeta(config: FieldConfig): NormalizedFieldMeta {
  const hasDefault = "default" in config && config.default !== undefined;
  const required =
    config.type === "relation"
      ? (config.relation.required ?? config.required === true) && !hasDefault
      : config.required === true && !hasDefault;

  const sensitive =
    config.type !== "relation" &&
    config.type !== "image" &&
    config.type !== "document" &&
    config.sensitive === true;

  const base: NormalizedFieldMeta = {
    type: config.type,
    required,
    optional: !required,
    ...(hasDefault ? { default: config.default } : {}),
    ...(sensitive ? { sensitive: true } : {}),
    ...("isArray" in config && config.isArray === true
      ? { isArray: true as const }
      : {}),
  };

  if (config.type === "relation") {
    return {
      ...base,
      relation: {
        ...config.relation,
        onDelete: getRelationOnDelete(config.relation),
      } satisfies RelationConfig,
    };
  }

  if (config.type === "enum") {
    return {
      ...base,
      enumValues: config.enumValues,
    };
  }

  if (config.type === "number" && config.numberKind) {
    return {
      ...base,
      numberKind: config.numberKind,
    };
  }

  if (config.type === "image") {
    return {
      ...base,
      ...(config.maxSizeBytes !== undefined
        ? { maxSizeBytes: config.maxSizeBytes }
        : {}),
      ...(config.defaultImage ? { defaultImage: config.defaultImage } : {}),
    };
  }

  if (config.type === "document") {
    return {
      ...base,
      ...(config.maxSizeBytes !== undefined
        ? { maxSizeBytes: config.maxSizeBytes }
        : {}),
    };
  }

  return base;
}

export function buildFieldMetadata<TFields extends FieldDefinitions>(
  fields: TFields,
): Readonly<Record<keyof TFields & string, NormalizedFieldMeta>> {
  const metadata = {} as Record<keyof TFields & string, NormalizedFieldMeta>;

  for (const [fieldName, fieldConfig] of Object.entries(fields) as Array<
    [keyof TFields & string, TFields[keyof TFields]]
  >) {
    metadata[fieldName] = normalizeFieldMeta(fieldConfig);
  }

  return metadata;
}
