import type {
  DataHookCondition,
  DataHookConditionLeaf,
  DataHookConditionNode,
  DataHookUpdateMatchingWhere,
} from "./data-hook-definition.js";
import { evaluateExpression } from "./expression.js";
import { evaluateConditionNode } from "./interpret-data-hook.js";
import type { ExpressionScope } from "./expression.js";
import type {
  HookContext,
  HookEntityListQuery,
  HookEntityRecord,
  HookEntityServices,
} from "./types.js";
import { HookExecutionError } from "./types.js";

export const MAX_MATCHING_RECORDS = 500;

export function normalizeUpdateMatchingWhere(
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

export function findUpdateMatchingLookupLeaf(
  node: DataHookConditionNode | DataHookCondition,
): DataHookConditionLeaf | null {
  const normalized = normalizeUpdateMatchingWhere(node);
  if (normalized.type === "condition") {
    if (normalized.operator === "==" && normalized.value) {
      return normalized;
    }
    return null;
  }

  for (const child of normalized.children) {
    const found = findUpdateMatchingLookupLeaf(child);
    if (found) {
      return found;
    }
  }
  return null;
}

export function hasUpdateMatchingLookupLeaf(
  node: DataHookConditionNode | DataHookCondition,
): boolean {
  return findUpdateMatchingLookupLeaf(node) !== null;
}

export async function listMatchingRecordsForWhere(
  entity: string,
  where: DataHookUpdateMatchingWhere,
  context: HookContext,
  scope: ExpressionScope,
  list: HookEntityServices["list"],
): Promise<readonly HookEntityRecord[]> {
  const normalized = normalizeUpdateMatchingWhere(where);
  const lookupLeaf = findUpdateMatchingLookupLeaf(normalized);
  if (!lookupLeaf) {
    throw new HookExecutionError(
      "Matching where must include at least one == leaf with a value expression for lookup.",
    );
  }

  const lookupValue = lookupLeaf.value
    ? evaluateExpression(lookupLeaf.value, scope)
    : null;
  // Preserve number/boolean — Firestore equality is typed, so String(726300)
  // does not match a numeric amount field (breaks email ingest link lookups).
  const queryValue =
    lookupValue == null
      ? ""
      : typeof lookupValue === "string" ||
          typeof lookupValue === "number" ||
          typeof lookupValue === "boolean"
        ? lookupValue
        : String(lookupValue);
  const query: HookEntityListQuery = {
    field: lookupLeaf.field,
    value: queryValue,
    limit: MAX_MATCHING_RECORDS,
  };
  const candidates = await list(entity, query);
  const triggerRecord = context.current;
  const matches: HookEntityRecord[] = [];

  for (const match of candidates) {
    const matchContext: HookContext = {
      ...context,
      current: match as Record<string, unknown>,
      previous: triggerRecord,
    };
    if (evaluateConditionNode(normalized, matchContext, scope)) {
      matches.push(match);
    }
  }

  return matches;
}
