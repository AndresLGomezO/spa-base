import { isOneToManyRelationField } from "@repo/entities";
import type {
  EntityQueryFilterNode,
  EntityCatalogEntry as QueryEntityCatalogEntry,
} from "@repo/entity-queries/browser";

import type { EntityCatalogEntry } from "../entities/entity-catalog";
import { tryGetEntityDefinition } from "../entities/entity-catalog";
import { getAccessibleEntityDefinition } from "./api-client";

function forEachFilterCondition(
  node: EntityQueryFilterNode | undefined,
  visit: (field: string) => void,
): void {
  if (!node) {
    return;
  }

  if (node.type === "condition") {
    visit(node.field);
    return;
  }

  for (const child of node.children) {
    forEachFilterCondition(child, visit);
  }
}

function inferRelationTargetEntityNames(
  sourceDefinition: EntityCatalogEntry,
  filter: EntityQueryFilterNode | undefined,
): readonly string[] {
  const targets = new Set<string>();

  forEachFilterCondition(filter, (fieldPath) => {
    if (!fieldPath.includes(".")) {
      return;
    }

    const firstSegment = fieldPath.split(".", 2)[0]?.trim();
    if (!firstSegment) {
      return;
    }

    for (const [fieldName, meta] of Object.entries(sourceDefinition.fields)) {
      const relation = meta.relation;
      if (!relation) {
        continue;
      }

      if (relation.type === "many-to-one" || relation.type === "one-to-one") {
        if (fieldName === firstSegment || relation.target === firstSegment) {
          targets.add(relation.target);
        }
        continue;
      }

      if (isOneToManyRelationField(meta)) {
        if (fieldName === firstSegment || relation.target === firstSegment) {
          targets.add(relation.target);
        }
      }
    }
  });

  return [...targets];
}

function mergeCatalogEntries(
  ...catalogs: ReadonlyArray<readonly EntityCatalogEntry[]>
): EntityCatalogEntry[] {
  const byName = new Map<string, EntityCatalogEntry>();

  for (const catalog of catalogs) {
    for (const entry of catalog) {
      byName.set(entry.name, entry);
    }
  }

  return [...byName.values()];
}

interface ResolveQueryExpansionCatalogInput {
  readonly baseCatalog: readonly EntityCatalogEntry[];
  readonly sourceEntity: string;
  readonly sourceDefinition?: EntityCatalogEntry;
  readonly filter?: EntityQueryFilterNode;
  readonly fetchDefinition?: (
    entityName: string,
  ) => Promise<EntityCatalogEntry>;
}

export async function resolveQueryExpansionCatalog(
  input: ResolveQueryExpansionCatalogInput,
): Promise<readonly QueryEntityCatalogEntry[]> {
  const fetchDefinition =
    input.fetchDefinition ?? getAccessibleEntityDefinition;
  const merged = mergeCatalogEntries(input.baseCatalog);

  async function ensureDefinition(
    entityName: string,
  ): Promise<EntityCatalogEntry> {
    const existing = tryGetEntityDefinition(entityName, merged);
    if (existing) {
      return existing;
    }

    const fetched = await fetchDefinition(entityName);
    merged.push(fetched);
    return fetched;
  }

  const sourceDefinition =
    input.sourceDefinition ?? (await ensureDefinition(input.sourceEntity));

  if (
    !tryGetEntityDefinition(sourceDefinition.name, merged) &&
    input.sourceDefinition
  ) {
    merged.push(sourceDefinition);
  }

  const relationTargets = inferRelationTargetEntityNames(
    sourceDefinition,
    input.filter,
  );

  await Promise.all(
    relationTargets.map((entityName) => ensureDefinition(entityName)),
  );

  return merged;
}
