import type {
  DataHookAction,
  DataHookCondition,
  DataHookConditionNode,
  DataHookDefinition,
} from "./data-hook-definition.js";
import { isBeforePhase, parseHookEvent } from "./event.js";
import {
  evaluateExpression,
  expressionValuesEqual,
  isEmptyExpressionValue,
  type ExpressionNode,
  type ExpressionScope,
  type ExpressionValue,
} from "./expression.js";
import type { HookContext, HookPhase } from "./types.js";
import { HookExecutionError } from "./types.js";

const MAX_LOOP_ITERATIONS = 1_000;
const MAX_MATCHING_RECORDS = 500;

/**
 * Re-entrancy guard for opt-in nested/chained hooks. Hook-initiated writes are
 * non-re-entrant by default (services write directly), so `context.depth`
 * normally stays 0; this cap prevents runaway recursion if nested dispatch is
 * ever enabled.
 */
const MAX_HOOK_DEPTH = 5;

function buildScope(context: HookContext, loopIndex?: number): ExpressionScope {
  return {
    current: context.current,
    ...(context.previous ? { previous: context.previous } : {}),
    now: new Date(),
    ...(context.user.uid ? { userId: context.user.uid } : {}),
    ...(loopIndex !== undefined ? { loopIndex } : {}),
  };
}

function evaluateExpressionRecord(
  record: Readonly<Record<string, ExpressionNode>>,
  scope: ExpressionScope,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [field, node] of Object.entries(record)) {
    output[field] = evaluateExpression(node, scope);
  }
  return output;
}

function readFieldValue(
  source: Record<string, unknown> | undefined,
  field: string,
): ExpressionValue {
  return evaluateExpression(
    { kind: "field", source: "current", path: field },
    {
      current: source ?? {},
      now: new Date(),
    },
  );
}

function evaluateConditionValue(
  condition: DataHookCondition,
  scope: ExpressionScope,
): ExpressionValue {
  if (!condition.value) {
    return null;
  }
  return evaluateExpression(condition.value, scope);
}

function evaluateConditionLeaf(
  condition: DataHookCondition,
  context: HookContext,
  scope: ExpressionScope,
): boolean {
  const fieldValue = readFieldValue(context.current, condition.field);

  switch (condition.operator) {
    case "isEmpty":
      return isEmptyExpressionValue(fieldValue);
    case "isNotEmpty":
      return !isEmptyExpressionValue(fieldValue);
    case "changed": {
      const previousValue = readFieldValue(context.previous, condition.field);
      return !expressionValuesEqual(fieldValue, previousValue);
    }
    case "in":
    case "notIn": {
      const target = evaluateConditionValue(condition, scope);
      const list = Array.isArray(target) ? (target as ExpressionValue[]) : [];
      const found = list.some((entry) =>
        expressionValuesEqual(entry, fieldValue),
      );
      return condition.operator === "in" ? found : !found;
    }
    default: {
      const target = evaluateConditionValue(condition, scope);
      return evaluateComparison(condition.operator, fieldValue, target);
    }
  }
}

/** Evaluates a single-field condition leaf (also used by `updateMatching.where`). */
export function evaluateCondition(
  condition: DataHookCondition,
  context: HookContext,
  scope: ExpressionScope,
): boolean {
  return evaluateConditionLeaf(condition, context, scope);
}

function normalizeConditionNode(
  node: DataHookConditionNode | DataHookCondition,
): DataHookConditionNode {
  if (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node.type === "condition" || node.type === "group")
  ) {
    return node;
  }
  return { type: "condition", ...node };
}

export function evaluateConditionNode(
  node: DataHookConditionNode | DataHookCondition,
  context: HookContext,
  scope: ExpressionScope,
): boolean {
  const normalized = normalizeConditionNode(node);
  if (normalized.type === "condition") {
    return evaluateConditionLeaf(normalized, context, scope);
  }

  if (normalized.children.length === 0) {
    return true;
  }

  if (normalized.combinator === "and") {
    for (const child of normalized.children) {
      if (!evaluateConditionNode(child, context, scope)) {
        return false;
      }
    }
    return true;
  }

  for (const child of normalized.children) {
    if (evaluateConditionNode(child, context, scope)) {
      return true;
    }
  }
  return false;
}

function evaluateComparison(
  operator: DataHookCondition["operator"],
  left: ExpressionValue,
  right: ExpressionValue,
): boolean {
  const op: ExpressionNode = {
    kind: "binary",
    op:
      operator === "=="
        ? "=="
        : operator === "!="
          ? "!="
          : operator === ">"
            ? ">"
            : operator === "<"
              ? "<"
              : operator === ">="
                ? ">="
                : "<=",
    left: { kind: "literal", value: left },
    right: { kind: "literal", value: right },
  };
  return Boolean(
    evaluateExpression(op, {
      current: {},
      now: new Date(),
    }),
  );
}

function updateFieldsChanged(
  definition: DataHookDefinition,
  context: HookContext,
): boolean {
  const fields = definition.trigger.updateFields;
  if (!fields || fields.length === 0) {
    return true;
  }
  return fields.some((field) => {
    const currentValue = readFieldValue(context.current, field);
    const previousValue = readFieldValue(context.previous, field);
    return !expressionValuesEqual(currentValue, previousValue);
  });
}

function requireEntities(
  context: HookContext,
): NonNullable<HookContext["services"]["entities"]> {
  if (!context.services.entities) {
    throw new HookExecutionError(
      "Entity services are required to run this data hook action.",
    );
  }
  return context.services.entities;
}

async function runAction(
  action: DataHookAction,
  context: HookContext,
  phase: HookPhase,
): Promise<void> {
  const scope = buildScope(context);

  switch (action.type) {
    case "setField": {
      const value = evaluateExpression(action.value, scope);
      if (isBeforePhase(phase)) {
        context.current[action.field] = value;
        return;
      }
      const entities = requireEntities(context);
      if (typeof context.current.id !== "string") {
        throw new HookExecutionError(
          "Current record id is required for setField in after hooks.",
        );
      }
      await entities.update(context.entityName, context.current.id, {
        [action.field]: value,
      });
      context.current[action.field] = value;
      return;
    }

    case "createRecord": {
      const entities = requireEntities(context);
      await entities.create(
        action.entity,
        evaluateExpressionRecord(action.data, scope),
      );
      return;
    }

    case "createRecords": {
      const entities = requireEntities(context);
      const rawCount = evaluateExpression(action.count, scope);
      const count = typeof rawCount === "number" ? Math.trunc(rawCount) : 0;
      if (count < 0) {
        throw new HookExecutionError(
          "createRecords count must be a non-negative number.",
        );
      }
      if (count > MAX_LOOP_ITERATIONS) {
        throw new HookExecutionError(
          `createRecords count (${count}) exceeds the maximum of ${MAX_LOOP_ITERATIONS}.`,
        );
      }
      for (let index = 0; index < count; index += 1) {
        const loopScope = buildScope(context, index);
        await entities.create(
          action.entity,
          evaluateExpressionRecord(action.data, loopScope),
        );
      }
      return;
    }

    case "updateMatching": {
      const entities = requireEntities(context);
      // The lookup value is resolved against the TRIGGER record scope (e.g.
      // "find commitments where contractId == current.id").
      const lookupValue = action.where.value
        ? evaluateExpression(action.where.value, scope)
        : null;
      const matches = await entities.list(action.entity, {
        field: action.where.field,
        value: lookupValue == null ? "" : String(lookupValue),
        limit: MAX_MATCHING_RECORDS,
      });
      for (const match of matches) {
        const fieldValue = readFieldValue(
          match as Record<string, unknown>,
          action.where.field,
        );
        if (!matchesLookup(action.where.operator, fieldValue, lookupValue)) {
          continue;
        }
        // `set` expressions see the matched record as `current` and the trigger
        // record as `previous`, so they can reference both.
        const setScope: ExpressionScope = {
          current: match as Record<string, unknown>,
          previous: context.current,
          now: new Date(),
          ...(context.user.uid ? { userId: context.user.uid } : {}),
        };
        await entities.update(
          action.entity,
          match.id,
          evaluateExpressionRecord(action.set, setScope),
        );
      }
      return;
    }

    case "sendNotification": {
      const message = evaluateExpression(action.message, scope);
      context.services.logger?.info("Data hook notification", {
        message: message == null ? "" : String(message),
        entityName: context.entityName,
        event: context.event,
        tenantId: context.tenantId,
      });
      return;
    }

    default: {
      const exhaustive: never = action;
      throw new HookExecutionError(
        `Unsupported data hook action: ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}

function matchesLookup(
  operator: DataHookCondition["operator"],
  fieldValue: ExpressionValue,
  lookupValue: ExpressionValue,
): boolean {
  switch (operator) {
    case "isEmpty":
      return isEmptyExpressionValue(fieldValue);
    case "isNotEmpty":
      return !isEmptyExpressionValue(fieldValue);
    case "changed":
      return true;
    case "in":
      return expressionValuesEqual(fieldValue, lookupValue);
    case "notIn":
      return !expressionValuesEqual(fieldValue, lookupValue);
    default:
      return evaluateComparison(operator, fieldValue, lookupValue);
  }
}

export async function runDataHook(
  definition: DataHookDefinition,
  context: HookContext,
): Promise<void> {
  if ((context.depth ?? 0) > MAX_HOOK_DEPTH) {
    context.services.logger?.error("Data hook depth limit exceeded", {
      entityName: context.entityName,
      event: context.event,
      depth: context.depth,
    });
    return;
  }

  const parsed = parseHookEvent(context.event);

  if (
    parsed.operation === "update" &&
    !updateFieldsChanged(definition, context)
  ) {
    return;
  }

  if (definition.condition) {
    const scope = buildScope(context);
    if (!evaluateConditionNode(definition.condition, context, scope)) {
      return;
    }
  }

  for (const action of definition.actions) {
    await runAction(action, context, parsed.phase);
  }
}

export function compileDataHook(
  definition: DataHookDefinition,
): (context: HookContext) => Promise<void> {
  return (context) => runDataHook(definition, context);
}
