import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecord,
} from "@repo/hooks";

export interface DataHookExecutionRepository {
  create(
    tenantId: string,
    input: CreateDataHookExecutionInput,
  ): Promise<DataHookExecutionRecord>;
  listByHookId(
    tenantId: string,
    hookId: string,
    options?: { readonly limit?: number },
  ): Promise<readonly DataHookExecutionRecord[]>;
}
