import type { SerializableEntityDefinition } from "@repo/entities";

export function buildManyToOnePopulateParam(
  definition: SerializableEntityDefinition | undefined,
): string | undefined {
  if (!definition) {
    return undefined;
  }

  const fkFields = Object.entries(definition.fields)
    .filter(
      ([, meta]) =>
        meta.relation?.type === "many-to-one" ||
        meta.relation?.type === "one-to-one",
    )
    .map(([name]) => name);

  return fkFields.length > 0 ? fkFields.join(",") : undefined;
}
