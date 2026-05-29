import type { HookRepository } from "@repo/firestore-converters";
import { invalidateTenantHookCache, registerDynamicHook } from "@repo/hooks";
import type { HookRecord } from "@repo/hooks";

export class HookRuntimeContext {
  private readonly loadedTenants = new Set<string>();

  constructor(private readonly hookRepository: HookRepository) {}

  get repository(): HookRepository {
    return this.hookRepository;
  }

  async ensureTenantHooksLoaded(tenantId: string): Promise<void> {
    if (this.loadedTenants.has(tenantId)) {
      return;
    }

    const records = await this.hookRepository.list(tenantId);
    for (const record of records) {
      registerDynamicHook(tenantId, record);
    }
    this.loadedTenants.add(tenantId);
  }

  async syncHook(record: HookRecord): Promise<void> {
    registerDynamicHook(record.tenantId, record);
    this.loadedTenants.add(record.tenantId);
  }

  async reloadTenantHooks(tenantId: string): Promise<void> {
    invalidateTenantHookCache(tenantId);
    this.loadedTenants.delete(tenantId);
    await this.ensureTenantHooksLoaded(tenantId);
  }
}

export function createHookRuntimeContext(
  hookRepository: HookRepository,
): HookRuntimeContext {
  return new HookRuntimeContext(hookRepository);
}
