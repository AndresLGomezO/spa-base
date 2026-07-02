import {
  createDataHookExecutionRecorder,
  type DataHookExecutionRepository,
} from "@repo/firestore-converters";
import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecorder,
} from "@repo/hooks";

export function createRecordDataHookExecution(
  repository: DataHookExecutionRepository,
  tenantId: string,
) {
  return async (entry: CreateDataHookExecutionInput): Promise<void> => {
    await repository.create(tenantId, entry);
  };
}

export function createDataHookExecutionRecorderForTenant(
  repository: DataHookExecutionRepository,
  tenantId: string,
): DataHookExecutionRecorder {
  return createDataHookExecutionRecorder(repository, tenantId);
}
