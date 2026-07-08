import {
  defineEntity,
  type DefinedEntity,
  type FieldConfig,
  type FieldDefinitions,
  type RelationType,
  type SerializableEntityDefinition,
  type SerializableFieldMeta,
} from "@repo/entities";

function serializableFieldToConfig(meta: SerializableFieldMeta): FieldConfig {
  switch (meta.type) {
    case "string":
      return {
        type: "string",
        required: meta.required,
        ...(meta.default !== undefined && typeof meta.default === "string"
          ? { default: meta.default }
          : {}),
        ...(meta.sensitive ? { sensitive: true } : {}),
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "number":
      return {
        type: "number",
        required: meta.required,
        ...(meta.numberKind ? { numberKind: meta.numberKind } : {}),
        ...(meta.default !== undefined && typeof meta.default === "number"
          ? { default: meta.default }
          : {}),
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "boolean":
      return {
        type: "boolean",
        required: meta.required,
        ...(meta.default !== undefined && typeof meta.default === "boolean"
          ? { default: meta.default }
          : {}),
      };
    case "date":
      return {
        type: "date",
        required: meta.required,
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "enum":
      return {
        type: "enum",
        required: meta.required,
        enumValues: meta.enumValues ?? [],
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "relation":
      return {
        type: "relation",
        required: meta.required,
        relation: {
          target: meta.relation?.target ?? "",
          type: (meta.relation?.type ?? "many-to-one") as RelationType,
          ...(meta.relation?.onDelete
            ? {
                onDelete: meta.relation.onDelete as
                  | "restrict"
                  | "cascade"
                  | "nullify",
              }
            : {}),
          ...(meta.relation?.joinCollection
            ? { joinCollection: meta.relation.joinCollection }
            : {}),
        },
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "image":
      return {
        type: "image",
        required: meta.required,
        ...(meta.maxSizeBytes ? { maxSizeBytes: meta.maxSizeBytes } : {}),
        ...(meta.isArray ? { isArray: true } : {}),
      };
    case "document":
      return {
        type: "document",
        required: meta.required,
        ...(meta.maxSizeBytes ? { maxSizeBytes: meta.maxSizeBytes } : {}),
        ...(meta.isArray ? { isArray: true } : {}),
      };
    default:
      return {
        type: "string",
        required: meta.required,
      };
  }
}

export function defineEntityFromCatalogDefinition(
  definition: SerializableEntityDefinition,
): DefinedEntity<string, FieldDefinitions> {
  const fields = Object.fromEntries(
    Object.entries(definition.fields).map(([name, meta]) => [
      name,
      serializableFieldToConfig(meta),
    ]),
  );

  return defineEntity({
    name: definition.name,
    collection: definition.collection,
    fields,
  } as Parameters<typeof defineEntity>[0]) as DefinedEntity<
    string,
    FieldDefinitions
  >;
}
