import {
  isScheduleTrigger,
  type DataHookDefinition,
} from "./data-hook-definition.js";
import { formatHookEvent, isBeforePhase, parseHookEvent } from "./event.js";
import { compileDataHook } from "./interpret-data-hook.js";
import type {
  HookContext,
  HookHandler,
  RegisteredDynamicHook,
  RegisteredHook,
  RegisteredSystemHook,
} from "./types.js";
import { HookExecutionError } from "./types.js";

const systemHookRegistry = new Map<string, RegisteredSystemHook[]>();
const dynamicHookRegistry = new Map<string, RegisteredDynamicHook[]>();

function sortHooks<T extends { readonly order: number }>(
  hooks: readonly T[],
): readonly T[] {
  return [...hooks].sort((left, right) => left.order - right.order);
}

function dynamicKey(tenantId: string, event: string): string {
  return `${tenantId}:${event}`;
}

export function registerSystemHook(entry: {
  readonly moduleName: string;
  readonly event: string;
  readonly handler: HookHandler;
  readonly order?: number;
}): void {
  const hook: RegisteredSystemHook = {
    source: "system",
    moduleName: entry.moduleName,
    event: entry.event,
    handler: entry.handler,
    order: entry.order ?? 0,
  };

  const existing = systemHookRegistry.get(entry.event) ?? [];
  existing.push(hook);
  systemHookRegistry.set(entry.event, existing);
}

function dataHookEvent(definition: DataHookDefinition): string {
  if (isScheduleTrigger(definition.trigger)) {
    return formatHookEvent({
      entity: definition.entity,
      phase: definition.phase,
      operation: "schedule",
    });
  }

  return formatHookEvent({
    entity: definition.entity,
    phase: definition.phase,
    operation: definition.trigger.operation,
  });
}

export function registerDynamicHook(
  tenantId: string,
  definition: DataHookDefinition,
): void {
  if (!definition.enabled) {
    unregisterDynamicHook(tenantId, definition.id);
    return;
  }

  const handler: HookHandler = compileDataHook(definition);

  const hook: RegisteredDynamicHook = {
    source: "dynamic",
    tenantId,
    definition,
    handler,
    order: definition.order,
  };

  const key = dynamicKey(tenantId, dataHookEvent(definition));
  const existing = (dynamicHookRegistry.get(key) ?? []).filter(
    (entry) => entry.definition.id !== definition.id,
  );
  existing.push(hook);
  dynamicHookRegistry.set(key, existing);
}

export function unregisterDynamicHook(tenantId: string, hookId: string): void {
  for (const [key, hooks] of dynamicHookRegistry.entries()) {
    if (!key.startsWith(`${tenantId}:`)) {
      continue;
    }

    const next = hooks.filter((hook) => hook.definition.id !== hookId);
    if (next.length === 0) {
      dynamicHookRegistry.delete(key);
    } else {
      dynamicHookRegistry.set(key, next);
    }
  }
}

export function invalidateTenantHookCache(tenantId: string): void {
  for (const key of dynamicHookRegistry.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      dynamicHookRegistry.delete(key);
    }
  }
}

export function getHooksForEvent(
  event: string,
  tenantId?: string,
): readonly RegisteredHook[] {
  const systemHooks = systemHookRegistry.get(event) ?? [];
  const dynamicHooks =
    tenantId != null
      ? (dynamicHookRegistry.get(dynamicKey(tenantId, event)) ?? [])
      : [];

  return sortHooks([...systemHooks, ...dynamicHooks]);
}

export function getAllRegisteredSystemHooks(): ReadonlyMap<
  string,
  RegisteredSystemHook[]
> {
  return systemHookRegistry;
}

export function clearHookRegistry(): void {
  systemHookRegistry.clear();
  dynamicHookRegistry.clear();
}

export async function executeHooks(
  event: string,
  context: HookContext,
): Promise<void> {
  const hooks = getHooksForEvent(event, context.tenantId);
  if (hooks.length === 0) {
    return;
  }

  const phase = parseHookEvent(event).phase;

  for (const hook of hooks) {
    try {
      await hook.handler(context);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Hook execution failed.";

      if (isBeforePhase(phase)) {
        throw new HookExecutionError(message);
      }

      context.services.logger?.error("Hook execution failed.", {
        event,
        tenantId: context.tenantId,
        source: hook.source,
        moduleName: hook.source === "system" ? hook.moduleName : undefined,
        hookId: hook.source === "dynamic" ? hook.definition.id : undefined,
        error: message,
      });
    }
  }
}

/** @deprecated Use registerSystemHook */
export function registerHook(entry: {
  readonly moduleName: string;
  readonly event: string;
  readonly handler: HookHandler;
  readonly order?: number;
}): void {
  registerSystemHook(entry);
}

/** @deprecated Use clearHookRegistry */
export function clearSystemHookRegistry(): void {
  clearHookRegistry();
}
