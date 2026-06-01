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

  const sensitive = config.type !== "relation" && config.sensitive === true;

  const base: NormalizedFieldMeta = {
    type: config.type,
    required,
    optional: !required,
    ...(hasDefault ? { default: config.default } : {}),
    ...(sensitive ? { sensitive: true } : {}),
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
