import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { EntityName } from "../../entities/entity-catalog";
import { useEntityFormModal } from "../../components/entity/entity-form-modal-context";
import {
  createEntity,
  isApiClientError,
  syncEntityRelationTargets,
  updateEntity,
} from "../../lib/api-client";
import { invalidateLivePageData } from "../../query/invalidate-live-page-data";
import { entityRecordQueryKey } from "../../query/query-client";
import { toast } from "@repo/ui";

import { bumpHookExecutionWatch } from "../notifications/use-silent-hook-execution-refresh";

export interface EntitySaveRequest {
  readonly entityName: EntityName;
  readonly entityLabel: string;
  readonly mode: "create" | "edit";
  readonly recordId?: string;
  readonly documentPayload: Record<string, unknown>;
  readonly joinRelations: Record<string, readonly string[]>;
  readonly draftValues: Record<string, unknown>;
  readonly formDesignId?: string;
  readonly createPrefill?: Readonly<Record<string, string>>;
  readonly createPrefillPopulated?: Readonly<
    Record<string, Record<string, unknown> | null>
  >;
}

export type EntitySaveTaskStatus = "running" | "success" | "error";

export interface EntitySaveTask {
  readonly id: string;
  readonly entityName: EntityName;
  readonly mode: "create" | "edit";
  readonly status: EntitySaveTaskStatus;
}

interface EntitySaveContextValue {
  readonly tasks: readonly EntitySaveTask[];
  readonly enqueueSave: (request: EntitySaveRequest) => void;
}

const EntitySaveContext = createContext<EntitySaveContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong.";
}

function createTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function EntitySaveManagerProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const { openEntityFormModal } = useEntityFormModal();
  const [tasks, setTasks] = useState<EntitySaveTask[]>([]);

  const enqueueSave = useCallback(
    (request: EntitySaveRequest) => {
      const taskId = createTaskId();
      const toastId = `entity-save-${taskId}`;

      setTasks((current) => [
        ...current,
        {
          id: taskId,
          entityName: request.entityName,
          mode: request.mode,
          status: "running",
        },
      ]);

      toast.loading(
        request.mode === "create"
          ? t("entitySave.savingCreate", { entity: request.entityLabel })
          : t("entitySave.savingUpdate", { entity: request.entityLabel }),
        { id: toastId },
      );

      void (async () => {
        try {
          let recordId = request.recordId;

          if (request.mode === "create") {
            const created = await createEntity<{
              readonly id: string;
            }>(request.entityName, request.documentPayload);
            recordId = created.id;
          } else if (!recordId) {
            throw new Error("Record id is required for update.");
          } else {
            await updateEntity(
              request.entityName,
              recordId,
              request.documentPayload,
            );
          }

          if (!recordId) {
            throw new Error("Record id is missing after save.");
          }

          for (const [fieldName, targetIds] of Object.entries(
            request.joinRelations,
          )) {
            await syncEntityRelationTargets(
              request.entityName,
              recordId,
              fieldName,
              targetIds,
            );
          }

          await queryClient.invalidateQueries({
            queryKey: ["entity", request.entityName],
          });
          if (request.mode === "edit") {
            await queryClient.invalidateQueries({
              queryKey: entityRecordQueryKey(request.entityName, recordId),
            });
          }
          void invalidateLivePageData(queryClient);
          bumpHookExecutionWatch();

          toast.success(
            request.mode === "create"
              ? t("entity.createSuccess", { entity: request.entityLabel })
              : t("entity.updateSuccess", { entity: request.entityLabel }),
            { id: toastId },
          );

          setTasks((current) =>
            current.map((task) =>
              task.id === taskId ? { ...task, status: "success" } : task,
            ),
          );
        } catch (error) {
          const message = isApiClientError(error)
            ? error.message
            : getErrorMessage(error);
          const fieldErrors = isApiClientError(error)
            ? error.fieldErrors
            : {};

          toast.error(message, {
            id: toastId,
            action: {
              label: t("entitySave.review"),
              onClick: () => {
                openEntityFormModal({
                  entityName: request.entityName,
                  mode: request.mode,
                  recordId: request.recordId,
                  formDesignId: request.formDesignId,
                  createPrefill: request.createPrefill,
                  createPrefillPopulated: request.createPrefillPopulated,
                  draftValues: request.draftValues,
                  draftFieldErrors: fieldErrors,
                });
              },
            },
          });

          setTasks((current) =>
            current.map((task) =>
              task.id === taskId ? { ...task, status: "error" } : task,
            ),
          );
        }
      })();
    },
    [openEntityFormModal, queryClient, t],
  );

  const value = useMemo(
    () => ({
      tasks,
      enqueueSave,
    }),
    [enqueueSave, tasks],
  );

  return (
    <EntitySaveContext.Provider value={value}>
      {children}
    </EntitySaveContext.Provider>
  );
}

export function useEntitySaveManager(): EntitySaveContextValue {
  const context = useContext(EntitySaveContext);
  if (!context) {
    throw new Error(
      "useEntitySaveManager must be used within EntitySaveManagerProvider",
    );
  }
  return context;
}
