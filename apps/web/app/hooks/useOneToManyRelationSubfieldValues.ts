import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";
import {
  isOneToManyRelationField,
  resolveOneToManyForeignKeyField,
} from "@repo/entities";

import { parseRelationFieldPath } from "../components/entity/resolve-relation-field-path";
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

async function loadOneToManyChildRecords(
  column: OneToManyColumnConfig,
  parentIds: readonly string[],
): Promise<ReadonlyMap<string, readonly Record<string, unknown>[]>> {
  const recordsByParentId = new Map<string, Record<string, unknown>[]>();
  for (const parentId of parentIds) {
    recordsByParentId.set(parentId, []);
  }

  if (parentIds.length === 0) {
    return recordsByParentId;
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
    const records = recordsByParentId.get(parentId);
    if (!records) {
      continue;
    }
    records.push(record);
  }

  return recordsByParentId;
}

export function useOneToManyRelationSubfieldValues(
  definition: SerializableEntityDefinition,
  items: readonly ParentRecord[],
  getDefinition: (name: EntityName) => SerializableEntityDefinition,
): {
  readonly getSubfieldValue: (recordId: string, fieldPath: string) => unknown;
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
        "one-to-many-subfield",
        definition.name,
        column.columnName,
        parentIdsKey,
      ],
      queryFn: () => loadOneToManyChildRecords(column, parentIds),
      enabled: parentIds.length > 0,
      staleTime: 30_000,
    })),
  });

  const childRecordsByColumn = useMemo(() => {
    const map = new Map<
      string,
      ReadonlyMap<string, readonly Record<string, unknown>[]>
    >();
    for (const [index, column] of oneToManyColumns.entries()) {
      map.set(column.columnName, columnQueries[index]?.data ?? new Map());
    }
    return map;
  }, [columnQueries, oneToManyColumns]);

  const isLoading = columnQueries.some((query) => query.isLoading);

  const getSubfieldValue = useCallback(
    (recordId: string, fieldPath: string) => {
      const parsed = parseRelationFieldPath(
        definition,
        fieldPath,
        getDefinition,
      );
      if (!parsed || parsed.relationKind !== "one-to-many") {
        return null;
      }

      const childRecords = childRecordsByColumn
        .get(parsed.relationField)
        ?.get(recordId);
      if (!childRecords || childRecords.length === 0) {
        return null;
      }

      return childRecords[0][parsed.subField] ?? null;
    },
    [childRecordsByColumn, definition, getDefinition],
  );

  return {
    isLoading,
    getSubfieldValue,
  };
}
