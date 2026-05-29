import type { CreateHookInput, HookRecord, PatchHookInput } from "@repo/hooks";

export interface HookRepository {
  list(tenantId: string): Promise<readonly HookRecord[]>;
  getById(tenantId: string, id: string): Promise<HookRecord | null>;
  create(tenantId: string, input: CreateHookInput): Promise<HookRecord>;
  update(
    tenantId: string,
    id: string,
    input: PatchHookInput,
  ): Promise<HookRecord>;
}
