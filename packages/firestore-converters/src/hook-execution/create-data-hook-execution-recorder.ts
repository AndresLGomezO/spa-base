import type {
  DataHookExecutionBaseFields,
  DataHookExecutionRecorder,
} from "@repo/hooks";

import type { DataHookExecutionRepository } from "./repository-contract.js";

export function createDataHookExecutionRecorder(
  repository: DataHookExecutionRepository,
  tenantId: string,
): DataHookExecutionRecorder {
  return {
    async createPending(input: DataHookExecutionBaseFields) {
      const record = await repository.create(tenantId, {
        ...input,
        status: "pending",
      });
      return { id: record.id };
    },
    async markRunning(executionId: string) {
      await repository.update(tenantId, executionId, { status: "running" });
    },
    async beginRunning(
      input: DataHookExecutionBaseFields,
      executionId?: string,
    ) {
      if (executionId) {
        await repository.update(tenantId, executionId, {
          status: "running",
          startedAt: input.startedAt,
        });
        return { id: executionId };
      }
      const record = await repository.create(tenantId, {
        ...input,
        status: "running",
      });
      return { id: record.id };
    },
    async finish(input) {
      await repository.update(tenantId, input.id, {
        status: input.status,
        durationMs: input.durationMs,
        finishedAt: input.finishedAt,
        ...(input.error ? { error: input.error } : {}),
        ...(input.chainDepth != null ? { chainDepth: input.chainDepth } : {}),
        ...(input.writesCreated != null
          ? { writesCreated: input.writesCreated }
          : {}),
        ...(input.writesUpdated != null
          ? { writesUpdated: input.writesUpdated }
          : {}),
        ...(input.writesDeleted != null
          ? { writesDeleted: input.writesDeleted }
          : {}),
        ...(input.writesByEntity
          ? { writesByEntity: input.writesByEntity }
          : {}),
        ...(input.actionTrace ? { actionTrace: input.actionTrace } : {}),
      });
    },
    async createTerminal(input) {
      await repository.create(tenantId, {
        ...input,
        status: input.status,
        error: input.error,
        durationMs: input.durationMs,
        finishedAt: input.finishedAt,
      });
    },
  };
}
