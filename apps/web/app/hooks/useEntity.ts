import { useCallback, useEffect, useMemo, useState } from "react";

import type { QueryConfig } from "@repo/query-engine";

import {
  createEntity,
  deleteEntity,
  getEntity,
  isApiClientError,
  listEntity,
  updateEntity,
} from "../lib/api-client";
import type { EntityName } from "../entities/entity-catalog";
import { useEntityDefinition } from "../entities/entity-catalog-context";

interface EntityRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [key: string]: unknown;
}

interface UseEntityOptions {
  readonly queryConfig?: QueryConfig;
}

interface UseEntityListState {
  readonly items: readonly EntityRecord[];
  readonly nextCursor: string | null;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly loadMore: () => Promise<void>;
}

interface UseEntityMutationsState {
  readonly isSubmitting: boolean;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly error: string | null;
  readonly create: (
    values: Record<string, unknown>,
  ) => Promise<EntityRecord | null>;
  readonly update: (
    id: string,
    values: Record<string, unknown>,
  ) => Promise<EntityRecord | null>;
  readonly remove: (id: string) => Promise<boolean>;
}

interface UseEntityResult extends UseEntityListState, UseEntityMutationsState {
  readonly getById: (id: string) => Promise<EntityRecord | null>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong.";
}

export function useEntity(
  entityName: EntityName,
  options: UseEntityOptions = {},
): UseEntityResult {
  useEntityDefinition(entityName);
  const queryConfig = options.queryConfig;
  const [items, setItems] = useState<EntityRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (cursor?: string) => {
      const result = await listEntity<EntityRecord>(entityName, {
        limit: queryConfig?.pagination?.limit ?? 20,
        cursor,
        query: queryConfig,
      });
      return result;
    },
    [entityName, queryConfig],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await fetchList();
      setItems([...result.items]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [fetchList]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setListError(null);
    try {
      const result = await fetchList(nextCursor);
      setItems((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchList, isLoadingMore, nextCursor]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getById = useCallback(
    async (id: string) => {
      try {
        return await getEntity<EntityRecord>(entityName, id);
      } catch (error) {
        setMutationError(getErrorMessage(error));
        return null;
      }
    },
    [entityName],
  );

  const create = useCallback(
    async (values: Record<string, unknown>) => {
      setIsSubmitting(true);
      setFieldErrors({});
      setMutationError(null);

      try {
        const created = await createEntity<EntityRecord>(entityName, values);
        setItems((current) => [created, ...current]);
        return created;
      } catch (error) {
        if (isApiClientError(error)) {
          setFieldErrors(error.fieldErrors);
        }
        setMutationError(getErrorMessage(error));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [entityName],
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      setIsSubmitting(true);
      setFieldErrors({});
      setMutationError(null);

      try {
        const updated = await updateEntity<EntityRecord>(
          entityName,
          id,
          values,
        );
        setItems((current) =>
          current.map((item) => (item.id === id ? updated : item)),
        );
        return updated;
      } catch (error) {
        if (isApiClientError(error)) {
          setFieldErrors(error.fieldErrors);
        }
        setMutationError(getErrorMessage(error));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [entityName],
  );

  const remove = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      setMutationError(null);
      try {
        await deleteEntity(entityName, id);
        setItems((current) => current.filter((item) => item.id !== id));
        return true;
      } catch (error) {
        setMutationError(getErrorMessage(error));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [entityName],
  );

  return useMemo(
    () => ({
      items,
      nextCursor,
      isLoading,
      isLoadingMore,
      error: listError ?? mutationError,
      refresh,
      loadMore,
      isSubmitting,
      fieldErrors,
      create,
      update,
      remove,
      getById,
    }),
    [
      create,
      fieldErrors,
      getById,
      isLoading,
      isLoadingMore,
      isSubmitting,
      items,
      listError,
      loadMore,
      mutationError,
      nextCursor,
      refresh,
      remove,
      update,
    ],
  );
}
