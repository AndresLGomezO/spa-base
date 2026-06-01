import type { DefinedEntity, FieldDefinitions } from "../types.js";
import { resolveEntityUI } from "./default-ui-config.js";
import type { SerializableEntityDefinition } from "./types.js";

export function serializeEntityDefinition(
  entity: DefinedEntity<string, FieldDefinitions>,
): SerializableEntityDefinition {
  const ui = resolveEntityUI(entity, entity.metadata.ui);

  const fields = {} as Record<
    string,
    SerializableEntityDefinition["fields"][string]
  >;
  for (const [fieldName, meta] of Object.entries(entity.metadata.fields)) {
    fields[fieldName] = {
      type: meta.type,
      required: meta.required,
      optional: meta.optional,
      ...(meta.default !== undefined ? { default: meta.default } : {}),
      ...(meta.relation
        ? {
            relation: {
              target: meta.relation.target,
              type: meta.relation.type,
              ...(meta.relation.onDelete
                ? { onDelete: meta.relation.onDelete }
                : {}),
              ...(meta.relation.joinCollection
                ? { joinCollection: meta.relation.joinCollection }
                : {}),
            },
          }
        : {}),
      ...(meta.enumValues ? { enumValues: meta.enumValues } : {}),
      ...(meta.sensitive ? { sensitive: true } : {}),
      ...(meta.numberKind ? { numberKind: meta.numberKind } : {}),
    };
  }

  return {
    name: entity.name,
    collection: entity.metadata.collection,
    permissions: [...entity.metadata.permissions],
    fields,
    ui,
    ...(entity.metadata.displayField
      ? { displayField: entity.metadata.displayField }
      : {}),
  };
}
