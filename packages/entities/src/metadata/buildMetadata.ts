import type {
  FieldConfig,
  FieldDefinitions,
  NormalizedFieldMeta,
} from "../types.js";

export function normalizeFieldMeta(config: FieldConfig): NormalizedFieldMeta {
  const hasDefault = "default" in config && config.default !== undefined;
  const required = config.required === true && !hasDefault;

  return {
    type: config.type,
    required,
    optional: !required,
    ...(hasDefault ? { default: config.default } : {}),
  };
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
