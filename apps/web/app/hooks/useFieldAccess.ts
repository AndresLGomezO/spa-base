import type { FieldAccessLevel } from "@repo/entities";

import type { EntityName } from "../entities/entity-catalog";
import { useEntityDefinition } from "../entities/entity-catalog-context";

export function useFieldAccess(
  entityName: EntityName,
): Readonly<Record<string, FieldAccessLevel>> {
  const definition = useEntityDefinition(entityName);
  return definition.fieldAccess ?? {};
}

export function getFieldAccessLevel(
  fieldAccess: Readonly<Record<string, FieldAccessLevel>>,
  fieldName: string,
): FieldAccessLevel | undefined {
  return fieldAccess[fieldName];
}
