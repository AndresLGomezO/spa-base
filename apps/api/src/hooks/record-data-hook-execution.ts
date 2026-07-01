import type { CreateDataHookExecutionInput } from "@repo/hooks";
import type { DataHookExecutionRepository } from "@repo/firestore-converters";

export function createRecordDataHookExecution(
  repository: DataHookExecutionRepository,
  tenantId: string,
) {
  return async (entry: CreateDataHookExecutionInput): Promise<void> => {
    await repository.create(tenantId, entry);
  };
}
