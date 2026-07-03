import type {
  DataHookAction,
  DataHookConditionNode,
  DataHookExecutionMode,
  DataHookPhase,
  DataHookTrigger,
} from "@repo/hooks";
import type { DataHookDefinitionFormData } from "@repo/hooks/browser";

export interface DataHookFormStateExportInput {
  readonly name: string;
  readonly description?: string;
  readonly entity: string;
  readonly phase: DataHookPhase;
  readonly trigger: DataHookTrigger;
  readonly condition: DataHookConditionNode | null;
  readonly actions: readonly DataHookAction[];
  readonly enabled: boolean;
  readonly order: number;
  readonly chainHooks: boolean;
  readonly execution: DataHookExecutionMode;
}

export function exportDataHookFormState(
  input: DataHookFormStateExportInput,
): DataHookDefinitionFormData {
  return {
    name: input.name.trim(),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    entity: input.entity,
    phase: input.phase,
    trigger: input.trigger,
    condition: input.condition,
    actions: [...input.actions],
    enabled: input.enabled,
    order: input.order,
    ...(input.chainHooks ? { chainHooks: input.chainHooks } : {}),
    ...(input.execution !== "sync" ? { execution: input.execution } : {}),
  };
}

export interface DataHookFormStateImportResult {
  readonly description?: string;
  readonly phase: DataHookPhase;
  readonly trigger: DataHookTrigger;
  readonly condition: DataHookConditionNode | null;
  readonly actions: readonly DataHookAction[];
  readonly enabled: boolean;
  readonly order: number;
  readonly chainHooks: boolean;
  readonly execution: DataHookExecutionMode;
}

export function importDataHookFormState(
  data: DataHookDefinitionFormData,
): DataHookFormStateImportResult {
  return {
    ...(data.description !== undefined
      ? { description: data.description }
      : {}),
    phase: data.phase ?? "after",
    trigger: data.trigger,
    condition: data.condition ?? null,
    actions: [...data.actions],
    enabled: data.enabled ?? true,
    order: data.order ?? 0,
    chainHooks: data.chainHooks ?? false,
    execution: data.execution ?? "sync",
  };
}
