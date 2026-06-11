import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { QueryConfig } from "@repo/query-engine";

import {
  createEntity,
  deleteEntity,
  getEntity,
  isApiClientError,
  isIndexListErrorCode,
  listEntity,
  updateEntity,
  type ApiClientError,
} from "../lib/api-client";
import type { EntityName } from "../entities/entity-catalog";
import { useEntityDefinition } from "../entities/entity-catalog-context";
import {
  entityListQueryKey,
  entityRecordQueryKey,
} from "../query/query-client";

export interface EntityRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [key: string]: unknown;
}

interface UseEntityOptions {
  readonly queryConfig?: QueryConfig;
  readonly page?: number;
}

interface UseEntityListState {
  readonly items: readonly EntityRecord[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly page: number;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly listError: ApiClientError | null;
  readonly refresh: () => Promise<void>;
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
  if (isApiClientError(error)) {
    if (error.code === "INDEX_CREATING") {
      return "Firestore indexes for this entity are still building. Please wait a few minutes and try again.";
    }
    if (error.code === "COMPOSITE_INDEX_REQUIRED") {
      return (
        error.message ||
        "This list query needs a composite index that is not deployed for this filter/sort combination. Save the entity model again to provision indexes, or use the Firebase Console link in the API response."
      );
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong.";
}

export function useEntity(
  entityName: EntityName,
  options: UseEntityOptions = {},
): UseEntityResult {
  const definition = useEntityDefinition(entityName);
  const queryConfig = options.queryConfig;
  const page = options.page ?? 1;
  const queryClient = useQueryClient();
  const listQueryKey = entityListQueryKey(entityName, queryConfig, page);

  const populateParam = useMemo(() => {
    const fkFields = Object.entries(definition.fields)
      .filter(
        ([, meta]) =>
          meta.relation &&
          (meta.relation.type === "many-to-one" ||
            meta.relation.type === "one-to-one"),
      )
      .map(([name]) => name);
    return fkFields.length > 0 ? fkFields.join(",") : undefined;
  }, [definition.fields]);

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      listEntity<EntityRecord>(entityName, {
        query: queryConfig,
        populate: populateParam,
      }),
    refetchInterval: (query) => {
      const error = query.state.error;
      if (isApiClientError(error) && isIndexListErrorCode(error.code)) {
        return 10_000;
      }
      return false;
    },
  });

  const listError = useMemo((): ApiClientError | null => {
    const error = listQuery.error;
    return isApiClientError(error) ? error : null;
  }, [listQuery.error]);

  const items = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const totalCount = listQuery.data?.totalCount ?? 0;
  const nextCursor = listQuery.data?.nextCursor ?? null;

  const refresh = useCallback(async () => {
    await listQuery.refetch();
  }, [listQuery]);

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const invalidateLists = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["entity", entityName],
    });
  }, [entityName, queryClient]);

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      createEntity<EntityRecord>(entityName, values),
    onSuccess: async () => {
      await invalidateLists();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: Record<string, unknown>;
    }) => updateEntity<EntityRecord>(entityName, id, values),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        invalidateLists(),
        queryClient.invalidateQueries({
          queryKey: entityRecordQueryKey(entityName, variables.id),
        }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntity(entityName, id),
    onSuccess: async () => {
      await invalidateLists();
    },
  });

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const create = useCallback(
    async (values: Record<string, unknown>) => {
      setFieldErrors({});
      setMutationError(null);
      try {
        return await createMutation.mutateAsync(values);
      } catch (error) {
        if (isApiClientError(error)) {
          setFieldErrors(error.fieldErrors);
        }
        setMutationError(getErrorMessage(error));
        return null;
      }
    },
    [createMutation],
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      setFieldErrors({});
      setMutationError(null);
      try {
        return await updateMutation.mutateAsync({ id, values });
      } catch (error) {
        if (isApiClientError(error)) {
          setFieldErrors(error.fieldErrors);
        }
        setMutationError(getErrorMessage(error));
        return null;
      }
    },
    [updateMutation],
  );

  const remove = useCallback(
    async (id: string) => {
      setMutationError(null);
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch (error) {
        setMutationError(getErrorMessage(error));
        return false;
      }
    },
    [deleteMutation],
  );

  const getById = useCallback(
    async (id: string) => {
      try {
        return await queryClient.fetchQuery({
          queryKey: entityRecordQueryKey(entityName, id),
          queryFn: () =>
            getEntity<EntityRecord>(entityName, id, {
              populate: populateParam,
            }),
        });
      } catch (error) {
        setMutationError(getErrorMessage(error));
        return null;
      }
    },
    [entityName, populateParam, queryClient],
  );

  return useMemo(
    () => ({
      items,
      totalCount,
      nextCursor,
      page,
      isLoading: listQuery.isLoading,
      listError,
      error:
        (listQuery.error ? getErrorMessage(listQuery.error) : null) ??
        mutationError,
      refresh,
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
      items,
      listError,
      listQuery.error,
      listQuery.isLoading,
      mutationError,
      nextCursor,
      page,
      refresh,
      remove,
      isSubmitting,
      totalCount,
      update,
    ],
  );
}
