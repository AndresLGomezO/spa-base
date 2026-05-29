import { parseHookEvent } from "./event.js";
import { type HookAction, HookExecutionError } from "./types.js";

export function validateHookEntityAndEvent(
  entity: string,
  event: string,
  availableEntities: readonly string[],
): void {
  if (!availableEntities.includes(entity)) {
    throw new HookExecutionError(
      `Entity "${entity}" is not available for this tenant.`,
    );
  }

  const parsed = parseHookEvent(event);
  if (parsed.entity !== entity) {
    throw new HookExecutionError(
      `Hook event "${event}" must target entity "${entity}".`,
    );
  }
}

export function validateHookActions(
  actions: readonly HookAction[],
  availableEntities: readonly string[],
): void {
  for (const action of actions) {
    if (
      action.type === "createRecord" &&
      !availableEntities.includes(action.entity)
    ) {
      throw new HookExecutionError(
        `Action target entity "${action.entity}" is not available for this tenant.`,
      );
    }
  }
}
