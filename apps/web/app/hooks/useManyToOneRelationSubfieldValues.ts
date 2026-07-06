import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { SerializableEntityDefinition } from "@repo/entities";

import type { EntityName } from "../entities/entity-catalog";
import {
  buildManyToOneRelationLoadPlans,
  loadManyToOneTargetRecords,
  mergeLoadedRelationsIntoPopulated,
  mergeRelationRecordMaps,
  readForeignKeyValues,
  readForeignKeyValuesFromLoadedRecords,
  resolveManyToOneSubfieldValue,
} from "./many-to-one-relation-subfield-values.js";

function indexItemsById(
  items: readonly Record<string, unknown>[],
): ReadonlyMap<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    const id = item.id;
    if (id === null || id === undefined) {
      continue;
    }
    const key = String(id).trim();
    if (key.length > 0) {
      map.set(key, item);
    }
  }
  return map;
}

export function useManyToOneRelationSubfieldValues(
  definition: SerializableEntityDefinition,
  items: readonly Record<string, unknown>[],
  getDefinition: (name: EntityName) => SerializableEntityDefinition,
): {
  readonly getSubfieldValue: (recordId: string, fieldPath: string) => unknown;
  readonly enrichItemWithLoadedRelations: (
    item: Record<string, unknown>,
  ) => Record<string, unknown>;
  readonly isLoading: boolean;
} {
  const loadPlans = useMemo(
    () => buildManyToOneRelationLoadPlans(definition, getDefinition),
    [definition, getDefinition],
  );

  const rootLoadPlans = useMemo(
    () => loadPlans.filter((plan) => plan.parentRelationField === null),
    [loadPlans],
  );

  const nestedLoadPlans = useMemo(
    () => loadPlans.filter((plan) => plan.parentRelationField !== null),
    [loadPlans],
  );

  const rootRelationQueries = useQueries({
    queries: rootLoadPlans.map((plan) => ({
      queryKey: [
        "many-to-one-subfield",
        definition.name,
        plan.relationField,
        readForeignKeyValues(items, plan.relationField).join(","),
      ],
      queryFn: () =>
        loadManyToOneTargetRecords(
          plan.targetEntity,
          readForeignKeyValues(items, plan.relationField),
          getDefinition,
        ),
      enabled: items.length > 0,
      staleTime: 30_000,
    })),
  });

  const rootIsLoading = rootRelationQueries.some((query) => query.isLoading);

  const rootTargetRecordsByRelation = useMemo(() => {
    const map = new Map<string, ReadonlyMap<string, Record<string, unknown>>>();
    for (const [index, plan] of rootLoadPlans.entries()) {
      map.set(
        plan.relationField,
        rootRelationQueries[index]?.data ?? new Map(),
      );
    }
    return map;
  }, [rootLoadPlans, rootRelationQueries]);

  const nestedRelationQueries = useQueries({
    queries: nestedLoadPlans.map((plan) => {
      const foreignKeys = readForeignKeyValuesFromLoadedRecords(
        rootTargetRecordsByRelation.get(plan.parentRelationField!),
        plan.relationField,
      );

      return {
        queryKey: [
          "many-to-one-subfield",
          definition.name,
          plan.parentRelationField,
          plan.relationField,
          foreignKeys.join(","),
        ],
        queryFn: () =>
          loadManyToOneTargetRecords(
            plan.targetEntity,
            foreignKeys,
            getDefinition,
          ),
        enabled: items.length > 0 && foreignKeys.length > 0 && !rootIsLoading,
        staleTime: 30_000,
      };
    }),
  });

  const nestedIsLoading = nestedRelationQueries.some(
    (query) => query.isLoading,
  );

  const targetRecordsByRelation = useMemo(() => {
    const map = new Map<string, ReadonlyMap<string, Record<string, unknown>>>(
      rootTargetRecordsByRelation,
    );

    for (const [index, plan] of nestedLoadPlans.entries()) {
      map.set(
        plan.relationField,
        mergeRelationRecordMaps(
          map.get(plan.relationField),
          nestedRelationQueries[index]?.data,
        ),
      );
    }

    return map;
  }, [nestedLoadPlans, nestedRelationQueries, rootTargetRecordsByRelation]);

  const itemsById = useMemo(() => indexItemsById(items), [items]);

  const isLoading = rootIsLoading || nestedIsLoading;

  const getSubfieldValue = useCallback(
    (recordId: string, fieldPath: string) => {
      const item = itemsById.get(recordId.trim());
      if (!item) {
        return null;
      }

      return resolveManyToOneSubfieldValue(
        item,
        fieldPath,
        definition,
        targetRecordsByRelation,
        getDefinition,
      );
    },
    [definition, getDefinition, itemsById, targetRecordsByRelation],
  );

  const enrichItemWithLoadedRelations = useCallback(
    (item: Record<string, unknown>) =>
      mergeLoadedRelationsIntoPopulated(
        item,
        definition,
        targetRecordsByRelation,
        getDefinition,
      ),
    [definition, getDefinition, targetRecordsByRelation],
  );

  return {
    isLoading,
    getSubfieldValue,
    enrichItemWithLoadedRelations,
  };
}
