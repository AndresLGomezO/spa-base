import type { DataHookDefinition } from "@repo/hooks";
import { isScheduleTrigger } from "@repo/hooks";
import type { DataHookRepository } from "@repo/firestore-converters";
import {
  scheduledHookWorkloadId,
  type WorkloadRecord,
} from "@repo/workload-registry";

export interface ScheduledHooksAdapterConfig {
  readonly listAllTenantIds: () => Promise<readonly string[]>;
  readonly dataHookRepository: DataHookRepository;
}

export function createScheduledHooksAdapter(config: ScheduledHooksAdapterConfig) {
  return {
    async list(): Promise<WorkloadRecord[]> {
      const tenantIds = await config.listAllTenantIds();
      const workloads: WorkloadRecord[] = [];

      for (const tenantId of tenantIds) {
        const hooks = await config.dataHookRepository.list(tenantId);
        for (const hook of hooks) {
          if (!isScheduleTrigger(hook.trigger)) continue;
          workloads.push(
            hookToWorkloadRecord(tenantId, hook),
          );
        }
      }

      return workloads;
    },

    async setEnabled(
      tenantId: string,
      hookId: string,
      enabled: boolean,
    ): Promise<void> {
      await config.dataHookRepository.update(tenantId, hookId, { enabled });
    },
  };
}

function hookToWorkloadRecord(
  tenantId: string,
  hook: DataHookDefinition,
): WorkloadRecord {
  const trigger = hook.trigger;
  const cron = isScheduleTrigger(trigger) ? trigger.cron : undefined;

  return {
    id: scheduledHookWorkloadId(tenantId, hook.id),
    kind: "scheduledDataHook",
    source: "hook",
    displayName: hook.name,
    description: hook.description ?? `Scheduled hook on ${hook.entity}`,
    actions: hook.enabled ? ["disable"] : ["enable"],
  };
}

export type ScheduledHooksAdapter = ReturnType<
  typeof createScheduledHooksAdapter
>;
