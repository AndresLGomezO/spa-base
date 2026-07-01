import {
  actionTargetEntities,
  type CreateDataHookInput,
  type DataHookAction,
  type PatchDataHookInput,
} from "./data-hook-definition.js";
import { HookExecutionError } from "./types.js";

export function validateDataHookEntity(
  entity: string,
  availableEntities: readonly string[],
): void {
  if (!availableEntities.includes(entity)) {
    throw new HookExecutionError(
      `Entity "${entity}" is not available for this tenant.`,
    );
  }
}

export function validateDataHookActions(
  actions: readonly DataHookAction[],
  availableEntities: readonly string[],
): void {
  for (const action of actions) {
    for (const target of actionTargetEntities(action)) {
      if (!availableEntities.includes(target)) {
        throw new HookExecutionError(
          `Action target entity "${target}" is not available for this tenant.`,
        );
      }
    }
  }
}

export function validateCreateDataHookInput(
  input: CreateDataHookInput,
  availableEntities: readonly string[],
): void {
  validateDataHookEntity(input.entity, availableEntities);
  validateDataHookActions(input.actions, availableEntities);
}

export function validatePatchDataHookInput(
  input: PatchDataHookInput,
  availableEntities: readonly string[],
): void {
  if (input.actions) {
    validateDataHookActions(input.actions, availableEntities);
  }
}
