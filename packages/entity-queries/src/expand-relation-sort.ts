import type { EntityCatalogEntry } from "./relation-field-path.js";
import {
  parseQueryableRelationPath,
  type QueryableRelationPath,
} from "./relation-field-path.js";
import type { EntityQuerySort } from "./types.js";

export interface ApplyRelationSortInput {
  readonly sourceEntity: string;
  readonly catalog: readonly EntityCatalogEntry[];
  readonly items: readonly Record<string, unknown>[];
  readonly sort: readonly EntityQuerySort[];
  readonly listRecords: (
    entityName: string,
    query: {
      readonly filter: readonly {
        readonly field: string;
        readonly operator: "==" | "in";
        readonly value: unknown;
      }[];
    },
  ) => Promise<readonly Record<string, unknown>[]>;
}

function compareSortValues(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }
  if (left === undefined || left === null) {
    return right === undefined || right === null ? 0 : -1;
  }
  if (right === undefined || right === null) {
    return 1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function sortRecordsByDirectField(
  items: readonly Record<string, unknown>[],
  field: string,
  direction: "asc" | "desc",
): Record<string, unknown>[] {
  const sorted = [...items];
  sorted.sort((left, right) => {
    const comparison = compareSortValues(left[field], right[field]);
    return direction === "desc" ? -comparison : comparison;
  });
  return sorted;
}

function uniqueNonEmptyStrings(values: readonly unknown[]): string[] {
  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}

async function buildManyToOneSortValues(
  items: readonly Record<string, unknown>[],
  relationPath: QueryableRelationPath & { readonly kind: "many-to-one" },
  listRecords: ApplyRelationSortInput["listRecords"],
): Promise<Map<string, unknown>> {
  const foreignKeyValues = uniqueNonEmptyStrings(
    items.map((item) => item[relationPath.foreignKeyField]),
  );
  if (foreignKeyValues.length === 0) {
    return new Map();
  }

  const targets = await listRecords(relationPath.targetEntity, {
    filter: [{ field: "id", operator: "in", value: foreignKeyValues }],
  });

  const valueByTargetId = new Map<string, unknown>();
  for (const target of targets) {
    const id = String(target.id ?? "");
    if (!id) {
      continue;
    }
    valueByTargetId.set(id, target[relationPath.subField]);
  }

  const valueByForeignKey = new Map<string, unknown>();
  for (const foreignKey of foreignKeyValues) {
    valueByForeignKey.set(foreignKey, valueByTargetId.get(foreignKey));
  }
  return valueByForeignKey;
}

async function buildOneToManySortValues(
  items: readonly Record<string, unknown>[],
  relationPath: QueryableRelationPath & { readonly kind: "one-to-many" },
  direction: "asc" | "desc",
  listRecords: ApplyRelationSortInput["listRecords"],
): Promise<Map<string, unknown>> {
  const parentIds = uniqueNonEmptyStrings(items.map((item) => item.id));
  if (parentIds.length === 0) {
    return new Map();
  }

  const children = await listRecords(relationPath.childEntity, {
    filter: [
      {
        field: relationPath.foreignKeyField,
        operator: "in",
        value: parentIds,
      },
    ],
  });

  const aggregateByParentId = new Map<string, unknown>();
  for (const child of children) {
    const parentId = String(child[relationPath.foreignKeyField] ?? "");
    if (!parentId) {
      continue;
    }
    const childValue = child[relationPath.subField];
    const current = aggregateByParentId.get(parentId);
    if (current === undefined) {
      aggregateByParentId.set(parentId, childValue);
      continue;
    }
    const comparison = compareSortValues(childValue, current);
    const replacesCurrent =
      direction === "asc" ? comparison < 0 : comparison > 0;
    if (replacesCurrent) {
      aggregateByParentId.set(parentId, childValue);
    }
  }

  return aggregateByParentId;
}

export async function applyRelationSortToItems(
  input: ApplyRelationSortInput,
): Promise<Record<string, unknown>[]> {
  const sortEntry = input.sort[0];
  if (!sortEntry || input.items.length === 0) {
    return [...input.items];
  }

  const sourceDefinition = input.catalog.find(
    (entry) => entry.name === input.sourceEntity,
  );
  if (!sourceDefinition) {
    return sortRecordsByDirectField(
      input.items,
      sortEntry.field,
      sortEntry.direction,
    );
  }

  const relationPath = parseQueryableRelationPath(
    sourceDefinition,
    input.catalog,
    sortEntry.field,
  );
  if (!relationPath) {
    return sortRecordsByDirectField(
      input.items,
      sortEntry.field,
      sortEntry.direction,
    );
  }

  const sortValues =
    relationPath.kind === "many-to-one"
      ? await buildManyToOneSortValues(
          input.items,
          relationPath,
          input.listRecords,
        )
      : await buildOneToManySortValues(
          input.items,
          relationPath,
          sortEntry.direction,
          input.listRecords,
        );

  const sorted = [...input.items];
  sorted.sort((left, right) => {
    const leftKey =
      relationPath.kind === "many-to-one"
        ? sortValues.get(String(left[relationPath.foreignKeyField] ?? ""))
        : sortValues.get(String(left.id ?? ""));
    const rightKey =
      relationPath.kind === "many-to-one"
        ? sortValues.get(String(right[relationPath.foreignKeyField] ?? ""))
        : sortValues.get(String(right.id ?? ""));
    const comparison = compareSortValues(leftKey, rightKey);
    return sortEntry.direction === "desc" ? -comparison : comparison;
  });
  return sorted;
}

export function isRelationSortField(
  sourceEntity: string,
  catalog: readonly EntityCatalogEntry[],
  field: string,
): boolean {
  const sourceDefinition = catalog.find((entry) => entry.name === sourceEntity);
  if (!sourceDefinition) {
    return false;
  }
  return parseQueryableRelationPath(sourceDefinition, catalog, field) !== null;
}
