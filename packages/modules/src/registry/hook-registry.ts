import {
  clearHookRegistry,
  executeHooks as emitHooks,
  getAllRegisteredSystemHooks,
  getHooksForEvent,
  registerSystemHook,
} from "@repo/hooks";

export { clearHookRegistry, emitHooks, getHooksForEvent, registerSystemHook };

export function registerHook(entry: {
  readonly moduleName: string;
  readonly event: string;
  readonly handler: Parameters<typeof registerSystemHook>[0]["handler"];
  readonly order?: number;
}): void {
  registerSystemHook(entry);
}

export function clearSystemHookRegistry(): void {
  clearHookRegistry();
}

export function getAllRegisteredHooks(): ReadonlyMap<
  string,
  ReturnType<typeof getHooksForEvent>
> {
  return getAllRegisteredSystemHooks();
}
