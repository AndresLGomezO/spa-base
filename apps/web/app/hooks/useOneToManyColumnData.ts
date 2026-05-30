import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  isOneToManyRelationField,
  resolveOneToManyForeignKeyField,
} from "@repo/entities";

import { formatRecordDisplayLabel } from "../components/entity/format-record-display-label";
import type { EntityName } from "../entities/entity-catalog";
import { listEntity } from "../lib/api-client";

interface OneToManyColumnConfig {
  readonly columnName: string;
  readonly targetEntity: string;
  readonly foreignKeyField: string;
}

interface ParentRecord {
  readonly id: string;
}

function getOneToManyColumns(
  definition: SerializableEntityDefinition,
  getDefinition: (name: EntityName) => SerializableEntityDefinition,
): readonly OneToManyColumnConfig[] {
  const columns: OneToManyColumnConfig[] = [];

  for (const [fieldName, meta] of Object.entries(definition.fields)) {
    if (!isOneToManyRelationField(meta)) {
      continue;
    }

    const targetEntity = meta.relation?.target;
    if (!targetEntity) {
      continue;
    }

    const targetDefinition = getDefinition(targetEntity);
    const foreignKeyField = resolveOneToManyForeignKeyField(
      definition.name,
      targetDefinition,
    );
    if (!foreignKeyField) {
      continue;
    }

    columns.push({
      columnName: fieldName,
      targetEntity,
      foreignKeyField,
    });
  }

  return columns;
}

async function loadOneToManyColumnValues(
  column: OneToManyColumnConfig,
  parentIds: readonly string[],
): Promise<ReadonlyMap<string, readonly string[]>> {
  const valuesByParentId = new Map<string, string[]>();
  for (const parentId of parentIds) {
    valuesByParentId.set(parentId, []);
  }

  if (parentIds.length === 0) {
    return valuesByParentId;
  }

  const result = await listEntity<Record<string, unknown>>(
    column.targetEntity,
    {
      limit: 100,
      query: {
        filter: [
          {
            field: column.foreignKeyField,
            operator: "in",
            value: [...parentIds],
          },
        ],
      },
    },
  );

  for (const record of result.items) {
    const parentId = record[column.foreignKeyField];
    if (typeof parentId !== "string") {
      continue;
    }
    const labels = valuesByParentId.get(parentId);
    if (!labels) {
      continue;
    }
    labels.push(formatRecordDisplayLabel(record));
  }

  return valuesByParentId;
}

export function useOneToManyColumnData(
  definition: SerializableEntityDefinition,
  items: readonly ParentRecord[],
  getDefinition: (name: EntityName) => SerializableEntityDefinition,
): {
  readonly getCellValue: (
    recordId: string,
    columnName: string,
  ) => string | null;
  readonly isLoading: boolean;
} {
  const oneToManyColumns = useMemo(
    () => getOneToManyColumns(definition, getDefinition),
    [definition, getDefinition],
  );
  const parentIds = useMemo(() => items.map((item) => item.id).sort(), [items]);
  const parentIdsKey = parentIds.join(",");

  const columnQueries = useQueries({
    queries: oneToManyColumns.map((column) => ({
      queryKey: [
        "one-to-many-column",
        definition.name,
        column.columnName,
        parentIdsKey,
      ],
      queryFn: () => loadOneToManyColumnValues(column, parentIds),
      enabled: parentIds.length > 0,
      staleTime: 30_000,
    })),
  });

  const valuesByColumn = useMemo(() => {
    const map = new Map<string, ReadonlyMap<string, readonly string[]>>();
    for (const [index, column] of oneToManyColumns.entries()) {
      map.set(column.columnName, columnQueries[index]?.data ?? new Map());
    }
    return map;
  }, [columnQueries, oneToManyColumns]);

  const isLoading = columnQueries.some((query) => query.isLoading);

  return {
    isLoading,
    getCellValue: (recordId, columnName) => {
      const columnValues = valuesByColumn.get(columnName);
      if (!columnValues) {
        return null;
      }
      const labels = columnValues.get(recordId);
      if (!labels || labels.length === 0) {
        return "—";
      }
      return labels.join(", ");
    },
  };
}
