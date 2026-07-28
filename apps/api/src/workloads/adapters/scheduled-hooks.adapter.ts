import type { DataHookDefinition } from "@repo/hooks";
import { getScheduleTimezone, isScheduleTrigger } from "@repo/hooks";
import type { DataHookRepository } from "@repo/firestore-converters";
import {
  inferWorkloadDomain,
  scheduledHookWorkloadId,
  type WorkloadRecord,
} from "@repo/workload-registry";

interface ScheduledHooksAdapterConfig {
  readonly listAllTenantIds: () => Promise<readonly string[]>;
  readonly dataHookRepository: DataHookRepository;
}

export function createScheduledHooksAdapter(
  config: ScheduledHooksAdapterConfig,
) {
  return {
    async list(): Promise<WorkloadRecord[]> {
      const tenantIds = await config.listAllTenantIds();
      const workloads: WorkloadRecord[] = [];

      for (const tenantId of tenantIds) {
        const hooks = await config.dataHookRepository.list(tenantId);
        for (const hook of hooks) {
          if (!isScheduleTrigger(hook.trigger)) continue;
          workloads.push(hookToWorkloadRecord(tenantId, hook));
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

export function hookToWorkloadRecord(
  tenantId: string,
  hook: DataHookDefinition,
): WorkloadRecord {
  const trigger = hook.trigger;
  const cron = isScheduleTrigger(trigger) ? trigger.cron : undefined;
  const timezone = isScheduleTrigger(trigger)
    ? getScheduleTimezone(trigger)
    : undefined;

  return {
    id: scheduledHookWorkloadId(tenantId, hook.id),
    kind: "scheduledDataHook",
    source: "hook",
    domain: inferWorkloadDomain({
      entity: hook.entity,
      name: hook.name,
      description: hook.description,
    }),
    displayName: hook.name,
    description: hook.description ?? `Scheduled hook on ${hook.entity}`,
    actions: hook.enabled ? ["disable"] : ["enable"],
    enabled: hook.enabled,
    ...(cron
      ? {
          schedule: {
            cron,
            ...(timezone ? { timezone } : {}),
          },
        }
      : {}),
  };
}

export type ScheduledHooksAdapter = ReturnType<
  typeof createScheduledHooksAdapter
>;
