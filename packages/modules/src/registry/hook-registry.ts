import type { RegisteredHook } from "../types.js";

const hookRegistry = new Map<string, RegisteredHook[]>();

export function registerHook(entry: RegisteredHook): void {
  const existing = hookRegistry.get(entry.event) ?? [];
  existing.push(entry);
  existing.sort((left, right) => left.order - right.order);
  hookRegistry.set(entry.event, existing);
}

export function getHooksForEvent(event: string): readonly RegisteredHook[] {
  return hookRegistry.get(event) ?? [];
}

export function getAllRegisteredHooks(): ReadonlyMap<string, RegisteredHook[]> {
  return hookRegistry;
}

export async function emitHooks(
  event: string,
  context: Parameters<RegisteredHook["handler"]>[0],
): Promise<void> {
  for (const hook of getHooksForEvent(event)) {
    try {
      await hook.handler(context);
    } catch (error) {
      context.services.logger?.error("Module hook failed.", {
        event,
        module: hook.moduleName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export function clearHookRegistry(): void {
  hookRegistry.clear();
}
