import { isBeforePhase, parseHookEvent } from "./event.js";
import type { HookAction, HookContext } from "./types.js";
import { HookExecutionError } from "./types.js";

export async function interpretActions(
  actions: readonly HookAction[],
  context: HookContext,
): Promise<void> {
  const parsed = parseHookEvent(context.event);

  for (const action of actions) {
    await interpretAction(action, context, parsed.phase);
  }
}

async function interpretAction(
  action: HookAction,
  context: HookContext,
  phase: "before" | "after",
): Promise<void> {
  switch (action.type) {
    case "updateField":
      if (isBeforePhase(phase)) {
        context.current = {
          ...context.current,
          [action.field]: action.value,
        };
        return;
      }

      if (!context.services.entities) {
        throw new HookExecutionError(
          "Entity services are required for updateField in after hooks.",
        );
      }

      if (typeof context.current.id !== "string") {
        throw new HookExecutionError(
          "Current record id is required for updateField in after hooks.",
        );
      }

      await context.services.entities.update(
        context.entityName,
        context.current.id,
        {
          [action.field]: action.value,
        },
      );
      return;

    case "createRecord":
      if (!context.services.entities) {
        throw new HookExecutionError(
          "Entity services are required for createRecord actions.",
        );
      }

      await context.services.entities.create(action.entity, action.data);
      return;

    case "sendNotification":
      context.services.logger?.info("Hook notification", {
        message: action.message,
        entityName: context.entityName,
        event: context.event,
        tenantId: context.tenantId,
      });
      return;

    default: {
      const exhaustive: never = action;
      throw new HookExecutionError(`Unsupported hook action: ${exhaustive}`);
    }
  }
}
