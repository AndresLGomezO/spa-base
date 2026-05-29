import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createEntity,
  deleteEntity,
  getEntity,
  isApiClientError,
  listEntity,
  updateEntity,
} from "../lib/api-client";
import {
  getEntityDefinition,
  type EntityName,
} from "../entities/entity-catalog";

interface EntityRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [key: string]: unknown;
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

interface ParsableSchema {
  safeParse(data: unknown):
    | { success: true; data: unknown }
    | {
        success: false;
        error: {
          issues: ReadonlyArray<{
            path: ReadonlyArray<PropertyKey>;
            message: string;
          }>;
        };
      };
}

function validateWithSchema(
  schema: ParsableSchema,
  values: Record<string, unknown>,
):
  | {
      readonly success: true;
      readonly data: Record<string, unknown>;
    }
  | {
      readonly success: false;
      readonly fieldErrors: Record<string, string>;
    } {
  const parsed = schema.safeParse(values);
  if (parsed.success) {
    return { success: true, data: parsed.data as Record<string, unknown> };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".");
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }

  return { success: false, fieldErrors };
}

export function useEntity(entityName: EntityName): UseEntityResult {
  const definition = getEntityDefinition(entityName).entity;
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
        limit: 20,
        cursor,
      });
      return result;
    },
    [entityName],
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

      const validated = validateWithSchema(definition.createSchema, values);
      if (!validated.success) {
        setFieldErrors(validated.fieldErrors);
        setIsSubmitting(false);
        return null;
      }

      try {
        const created = await createEntity<EntityRecord>(
          entityName,
          validated.data,
        );
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
    [definition.createSchema, entityName],
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      setIsSubmitting(true);
      setFieldErrors({});
      setMutationError(null);

      const validated = validateWithSchema(definition.updateSchema, values);
      if (!validated.success) {
        setFieldErrors(validated.fieldErrors);
        setIsSubmitting(false);
        return null;
      }

      try {
        const updated = await updateEntity<EntityRecord>(
          entityName,
          id,
          validated.data,
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
    [definition.updateSchema, entityName],
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
