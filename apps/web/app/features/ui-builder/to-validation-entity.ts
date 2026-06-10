import type {
  DefinedEntity,
  FieldDefinitions,
  SerializableEntityDefinition,
} from "@repo/entities";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

export function toValidationEntity(
  definition: SerializableEntityDefinition,
): AnyDefinedEntity {
  return {
    name: definition.name,
    metadata: {
      collection: definition.collection,
      permissions: definition.permissions,
      fields: Object.fromEntries(
        Object.entries(definition.fields).map(([fieldName, field]) => [
          fieldName,
          {
            type: field.type,
            required: field.required,
            optional: field.optional,
            ...(field.relation
              ? {
                  relation: {
                    target: field.relation.target,
                    type: field.relation.type,
                    ...(field.relation.onDelete
                      ? { onDelete: field.relation.onDelete }
                      : {}),
                    ...(field.relation.joinCollection
                      ? { joinCollection: field.relation.joinCollection }
                      : {}),
                  },
                }
              : {}),
          },
        ]),
      ),
      ui: definition.ui,
    },
  } as AnyDefinedEntity;
}
