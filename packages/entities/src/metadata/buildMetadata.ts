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

  const base: NormalizedFieldMeta = {
    type: config.type,
    required,
    optional: !required,
    ...(hasDefault ? { default: config.default } : {}),
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
