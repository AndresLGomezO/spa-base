import type { SerializableEntityDefinition } from "@repo/entities";
import type { DataViewColumnDescriptor } from "@repo/data-view";

interface RelationFilterTarget {
  readonly columnId: string;
  readonly target: string;
}

export function getFilterableRelationTargets(
  definition: SerializableEntityDefinition,
  columns: readonly Pick<
    DataViewColumnDescriptor<unknown>,
    "id" | "filterable"
  >[],
): readonly RelationFilterTarget[] {
  const targets: RelationFilterTarget[] = [];

  for (const column of columns) {
    if (column.filterable === false) {
      continue;
    }

    const fieldMeta = definition.fields[column.id];
    if (
      fieldMeta?.relation?.type !== "many-to-one" &&
      fieldMeta?.relation?.type !== "one-to-one"
    ) {
      continue;
    }

    targets.push({ columnId: column.id, target: fieldMeta.relation.target });
  }

  return targets;
}
