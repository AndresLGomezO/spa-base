import type {
  CreateDataHookInput,
  DataHookDefinition,
  PatchDataHookInput,
} from "@repo/hooks";

export interface DataHookRepository {
  list(tenantId: string): Promise<readonly DataHookDefinition[]>;
  getById(tenantId: string, id: string): Promise<DataHookDefinition | null>;
  create(
    tenantId: string,
    input: CreateDataHookInput,
  ): Promise<DataHookDefinition>;
  update(
    tenantId: string,
    id: string,
    input: PatchDataHookInput,
  ): Promise<DataHookDefinition>;
  delete(tenantId: string, id: string): Promise<void>;
}
