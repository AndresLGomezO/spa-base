import type { EntityNavigationTarget } from "@repo/ui-builder-core";
import type { SerializableEntityDefinition } from "@repo/entities";

import {
  parseRelationFieldPath,
  resolveRelationFieldName,
  type RelationDefinitionLookup,
} from "../../components/entity/resolve-relation-field-path";

function resolveRelationTargetEntity(
  definition: SerializableEntityDefinition,
  relationFieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): { readonly fkField: string; readonly targetEntity: string } | null {
  const trimmed = relationFieldPath.trim();
  if (!trimmed) {
    return null;
  }

  const directMeta = definition.fields[trimmed];
  if (
    directMeta?.relation &&
    (directMeta.relation.type === "many-to-one" ||
      directMeta.relation.type === "one-to-one")
  ) {
    return { fkField: trimmed, targetEntity: directMeta.relation.target };
  }

  const resolvedFk = resolveRelationFieldName(definition, trimmed);
  if (resolvedFk) {
    const meta = definition.fields[resolvedFk];
    if (meta?.relation?.target) {
      return { fkField: resolvedFk, targetEntity: meta.relation.target };
    }
  }

  const parsed = parseRelationFieldPath(definition, trimmed, getDefinition);
  if (
    parsed &&
    (parsed.relationKind === "many-to-one" ||
      parsed.relationKind === "one-to-one")
  ) {
    const meta = definition.fields[parsed.relationField];
    if (meta?.relation?.target) {
      return {
        fkField: parsed.relationField,
        targetEntity: meta.relation.target,
      };
    }
  }

  if (trimmed.includes(".")) {
    const root = trimmed.split(".")[0] ?? trimmed;
    if (root !== trimmed) {
      return resolveRelationTargetEntity(definition, root, getDefinition);
    }
  }

  return null;
}

function resolveOneToManyRelationEntity(
  definition: SerializableEntityDefinition,
  relationFieldPath: string,
  getDefinition?: RelationDefinitionLookup,
): {
  readonly relationField: string;
  readonly targetEntity: string;
} | null {
  const trimmed = relationFieldPath.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseRelationFieldPath(definition, trimmed, getDefinition);
  if (parsed?.relationKind === "one-to-many") {
    const meta = definition.fields[parsed.relationField];
    const targetEntity = meta?.relation?.target;
    if (targetEntity) {
      return { relationField: parsed.relationField, targetEntity };
    }
  }

  const directMeta = definition.fields[trimmed];
  if (
    directMeta?.relation?.type === "one-to-many" &&
    directMeta.relation.target
  ) {
    return { relationField: trimmed, targetEntity: directMeta.relation.target };
  }

  if (trimmed.includes(".")) {
    const root = trimmed.split(".")[0] ?? trimmed;
    if (root !== trimmed) {
      return resolveOneToManyRelationEntity(definition, root, getDefinition);
    }
  }

  return null;
}

export function resolveCreateFormTargetEntityName(
  target: EntityNavigationTarget,
  sourceDefinition: SerializableEntityDefinition,
  getDefinition?: RelationDefinitionLookup,
): string | undefined {
  if (target.scope === "entity") {
    const entityName = target.entityName.trim();
    return entityName.length > 0 ? entityName : undefined;
  }

  if (target.scope !== "relation") {
    return undefined;
  }

  const relationFieldPath = target.relationFieldPath.trim();
  if (!relationFieldPath) {
    return undefined;
  }

  const m2o = resolveRelationTargetEntity(
    sourceDefinition,
    relationFieldPath,
    getDefinition,
  );
  if (m2o) {
    return m2o.targetEntity;
  }

  const o2m = resolveOneToManyRelationEntity(
    sourceDefinition,
    relationFieldPath,
    getDefinition,
  );
  return o2m?.targetEntity;
}
