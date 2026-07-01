import type { DataHookRepository } from "@repo/firestore-converters";
import {
  invalidateTenantHookCache,
  registerDynamicHook,
  unregisterDynamicHook,
} from "@repo/hooks";
import type { DataHookDefinition } from "@repo/hooks";

export class HookRuntimeContext {
  private readonly loadedTenants = new Set<string>();

  constructor(private readonly hookRepository: DataHookRepository) {}

  get repository(): DataHookRepository {
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

  async syncHook(definition: DataHookDefinition): Promise<void> {
    registerDynamicHook(definition.tenantId, definition);
    this.loadedTenants.add(definition.tenantId);
  }

  unregister(tenantId: string, hookId: string): void {
    unregisterDynamicHook(tenantId, hookId);
  }

  async reloadTenantHooks(tenantId: string): Promise<void> {
    invalidateTenantHookCache(tenantId);
    this.loadedTenants.delete(tenantId);
    await this.ensureTenantHooksLoaded(tenantId);
  }
}
