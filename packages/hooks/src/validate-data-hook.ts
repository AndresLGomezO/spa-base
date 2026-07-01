import {
  actionTargetEntities,
  isScheduleTrigger,
  MAX_AGGREGATE_ACTIONS,
  MAX_LOADED_RECORDS,
  type CreateDataHookInput,
  type DataHookAction,
  type DataHookCondition,
  type DataHookConditionNode,
  type DataHookExecutionMode,
  type DataHookPhase,
  type DataHookTrigger,
  type PatchDataHookInput,
} from "./data-hook-definition.js";
import type { ExpressionNode } from "./expression.js";
import { isArrayLiteralNode } from "./expression.js";
import { validateCreateRecordsLiteralCount } from "./create-records-utils.js";
import {
  getScheduleScope,
  validateCronExpression,
  validateTimezone,
} from "./schedule-trigger-utils.js";
import { hasUpdateMatchingLookupLeaf } from "./update-matching-utils.js";
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

function walkExpressionNodes(
  node: ExpressionNode,
  visit: (node: ExpressionNode) => void,
): void {
  visit(node);
  if (node.kind === "unary") {
    walkExpressionNodes(node.operand, visit);
    return;
  }
  if (node.kind === "binary") {
    walkExpressionNodes(node.left, visit);
    walkExpressionNodes(node.right, visit);
    return;
  }
  if (node.kind === "call") {
    for (const arg of node.args) {
      walkExpressionNodes(arg, visit);
    }
    return;
  }
  if (node.kind === "switch") {
    walkExpressionNodes(node.input, visit);
    for (const switchCase of node.cases) {
      walkExpressionNodes(switchCase.when, visit);
      walkExpressionNodes(switchCase.then, visit);
    }
    walkExpressionNodes(node.default, visit);
  }
}

function collectLoadedAliases(node: ExpressionNode): readonly string[] {
  const aliases: string[] = [];
  walkExpressionNodes(node, (current) => {
    if (current.kind === "field" && current.source === "loaded") {
      aliases.push(current.alias);
    }
  });
  return aliases;
}

function collectAggregateAliases(node: ExpressionNode): readonly string[] {
  const aliases: string[] = [];
  walkExpressionNodes(node, (current) => {
    if (current.kind === "field" && current.source === "aggregate") {
      aliases.push(current.alias);
    }
  });
  return aliases;
}

function collectLoadedAliasesInRecord(
  record: Readonly<Record<string, ExpressionNode>>,
): readonly string[] {
  const aliases: string[] = [];
  for (const node of Object.values(record)) {
    aliases.push(...collectLoadedAliases(node));
  }
  return aliases;
}

function collectAggregateAliasesInRecord(
  record: Readonly<Record<string, ExpressionNode>>,
): readonly string[] {
  const aliases: string[] = [];
  for (const node of Object.values(record)) {
    aliases.push(...collectAggregateAliases(node));
  }
  return aliases;
}

function validateLoadedAliases(
  aliases: readonly string[],
  available: ReadonlySet<string>,
): void {
  for (const alias of aliases) {
    if (!available.has(alias)) {
      throw new HookExecutionError(
        `Expression references unknown loaded alias "${alias}". Add a prior getRecord action with as="${alias}".`,
      );
    }
  }
}

function validateAggregateAliases(
  aliases: readonly string[],
  available: ReadonlySet<string>,
): void {
  for (const alias of aliases) {
    if (!available.has(alias)) {
      throw new HookExecutionError(
        `Expression references unknown aggregate alias "${alias}". Add a prior aggregateMatching action with as="${alias}".`,
      );
    }
  }
}

function rejectArrayLiteralsInExpression(node: ExpressionNode): void {
  walkExpressionNodes(node, (current) => {
    if (isArrayLiteralNode(current)) {
      throw new HookExecutionError(
        "Array literals are only allowed as the value of in/notIn condition operators.",
      );
    }
  });
}

function walkConditionNodes(
  node: DataHookConditionNode,
  visitLeaf: (leaf: DataHookCondition) => void,
): void {
  if (node.type === "condition") {
    visitLeaf(node);
    return;
  }
  for (const child of node.children) {
    walkConditionNodes(child, visitLeaf);
  }
}

function validateConditionExpressions(
  condition: DataHookConditionNode,
  availableLoaded: ReadonlySet<string>,
  availableAggregates: ReadonlySet<string>,
): void {
  walkConditionNodes(condition, (leaf) => {
    const allowsArray = leaf.operator === "in" || leaf.operator === "notIn";
    if (leaf.value) {
      walkExpressionNodes(leaf.value, (current) => {
        if (isArrayLiteralNode(current) && !allowsArray) {
          throw new HookExecutionError(
            "Array literals are only allowed as the value of in/notIn condition operators.",
          );
        }
      });
      validateLoadedAliases(collectLoadedAliases(leaf.value), availableLoaded);
      validateAggregateAliases(
        collectAggregateAliases(leaf.value),
        availableAggregates,
      );
    }
  });
}

function validateActionExpressions(
  action: DataHookAction,
  availableLoaded: ReadonlySet<string>,
  availableAggregates: ReadonlySet<string>,
): void {
  switch (action.type) {
    case "setField":
      rejectArrayLiteralsInExpression(action.value);
      validateLoadedAliases(
        collectLoadedAliases(action.value),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliases(action.value),
        availableAggregates,
      );
      return;
    case "createRecord":
      for (const node of Object.values(action.data)) {
        rejectArrayLiteralsInExpression(node);
      }
      validateLoadedAliases(
        collectLoadedAliasesInRecord(action.data),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliasesInRecord(action.data),
        availableAggregates,
      );
      return;
    case "createRecords":
      rejectArrayLiteralsInExpression(action.count);
      if (action.startIndex) {
        rejectArrayLiteralsInExpression(action.startIndex);
        validateLoadedAliases(
          collectLoadedAliases(action.startIndex),
          availableLoaded,
        );
        validateAggregateAliases(
          collectAggregateAliases(action.startIndex),
          availableAggregates,
        );
      }
      validateLoadedAliases(
        collectLoadedAliases(action.count),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliases(action.count),
        availableAggregates,
      );
      for (const node of Object.values(action.data)) {
        rejectArrayLiteralsInExpression(node);
      }
      validateLoadedAliases(
        collectLoadedAliasesInRecord(action.data),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliasesInRecord(action.data),
        availableAggregates,
      );
      return;
    case "updateMatching":
      for (const node of Object.values(action.set)) {
        rejectArrayLiteralsInExpression(node);
      }
      validateLoadedAliases(
        collectLoadedAliasesInRecord(action.set),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliasesInRecord(action.set),
        availableAggregates,
      );
      return;
    case "deleteRecord":
    case "getRecord":
      rejectArrayLiteralsInExpression(action.id);
      validateLoadedAliases(collectLoadedAliases(action.id), availableLoaded);
      validateAggregateAliases(
        collectAggregateAliases(action.id),
        availableAggregates,
      );
      return;
    case "sendNotification":
      rejectArrayLiteralsInExpression(action.message);
      validateLoadedAliases(
        collectLoadedAliases(action.message),
        availableLoaded,
      );
      validateAggregateAliases(
        collectAggregateAliases(action.message),
        availableAggregates,
      );
      return;
    case "callWebhook":
      rejectArrayLiteralsInExpression(action.url);
      validateLoadedAliases(collectLoadedAliases(action.url), availableLoaded);
      validateAggregateAliases(
        collectAggregateAliases(action.url),
        availableAggregates,
      );
      if (action.body) {
        rejectArrayLiteralsInExpression(action.body);
        validateLoadedAliases(
          collectLoadedAliases(action.body),
          availableLoaded,
        );
        validateAggregateAliases(
          collectAggregateAliases(action.body),
          availableAggregates,
        );
      }
      return;
    case "deleteMatching":
    case "aggregateMatching":
      return;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function registerBindingAlias(alias: string, boundAliases: Set<string>): void {
  if (boundAliases.has(alias)) {
    throw new HookExecutionError(
      `Duplicate binding alias "${alias}". Each getRecord or aggregateMatching as value must be unique.`,
    );
  }
  boundAliases.add(alias);
}

export function validateDataHookActions(
  actions: readonly DataHookAction[],
  availableEntities: readonly string[],
): void {
  const boundAliases = new Set<string>();
  const loadedAliases = new Set<string>();
  const aggregateAliases = new Set<string>();
  let getRecordCount = 0;
  let aggregateCount = 0;

  for (const action of actions) {
    for (const target of actionTargetEntities(action)) {
      if (!availableEntities.includes(target)) {
        throw new HookExecutionError(
          `Action target entity "${target}" is not available for this tenant.`,
        );
      }
    }
    if (
      action.type === "updateMatching" ||
      action.type === "deleteMatching" ||
      action.type === "aggregateMatching"
    ) {
      validateUpdateMatchingWhere(action.where);
    }

    if (action.type === "aggregateMatching" && action.op !== "count") {
      if (!action.field || action.field.trim().length === 0) {
        throw new HookExecutionError(
          `aggregateMatching ${action.op} requires a non-empty field name.`,
        );
      }
    }

    validateActionExpressions(action, loadedAliases, aggregateAliases);

    if (action.type === "getRecord") {
      getRecordCount += 1;
      if (getRecordCount > MAX_LOADED_RECORDS) {
        throw new HookExecutionError(
          `Hook exceeds the maximum of ${MAX_LOADED_RECORDS} getRecord actions.`,
        );
      }
      registerBindingAlias(action.as, boundAliases);
      loadedAliases.add(action.as);
    }

    if (action.type === "aggregateMatching") {
      aggregateCount += 1;
      if (aggregateCount > MAX_AGGREGATE_ACTIONS) {
        throw new HookExecutionError(
          `Hook exceeds the maximum of ${MAX_AGGREGATE_ACTIONS} aggregateMatching actions.`,
        );
      }
      registerBindingAlias(action.as, boundAliases);
      aggregateAliases.add(action.as);
    }
  }
}

function validateUpdateMatchingWhere(where: DataHookConditionNode): void {
  if (!hasUpdateMatchingLookupLeaf(where)) {
    throw new HookExecutionError(
      "Matching where must include at least one == leaf with a value expression for lookup.",
    );
  }
  validateConditionExpressions(where, new Set(), new Set());
}

export function validateDataHookCondition(
  condition: DataHookConditionNode,
): void {
  validateConditionExpressions(condition, new Set(), new Set());
}

function validateDataHookTrigger(
  trigger: DataHookTrigger,
  phase: CreateDataHookInput["phase"] | PatchDataHookInput["phase"],
): void {
  if (!isScheduleTrigger(trigger)) {
    return;
  }

  if (phase === "before") {
    throw new HookExecutionError("Scheduled hooks must use after phase.");
  }

  validateCronExpression(trigger.cron);
  const timezone = trigger.timezone?.trim() || "UTC";
  validateTimezone(timezone);

  const scope = getScheduleScope(trigger);
  if (scope === "eachRecord") {
    if (!trigger.eachRecordWhere) {
      throw new HookExecutionError(
        "Scheduled hooks with eachRecord scope require eachRecordWhere.",
      );
    }
    validateUpdateMatchingWhere(trigger.eachRecordWhere);
  }
}

function validateHookCondition(
  condition: DataHookConditionNode | null | undefined,
): void {
  if (condition) {
    validateDataHookCondition(condition);
  }
}

function validateCreateRecordsInActions(
  actions: readonly DataHookAction[],
  phase: DataHookPhase,
  execution?: DataHookExecutionMode,
): void {
  for (const action of actions) {
    if (action.type !== "createRecords") {
      continue;
    }
    validateCreateRecordsLiteralCount(
      action.count,
      phase,
      execution,
      action.startIndex,
    );
  }
}

export function validateCreateDataHookInput(
  input: CreateDataHookInput,
  availableEntities: readonly string[],
): void {
  validateDataHookEntity(input.entity, availableEntities);
  validateDataHookTrigger(input.trigger, input.phase);
  validateHookCondition(input.condition);
  validateDataHookActions(input.actions, availableEntities);
  validateCreateRecordsInActions(
    input.actions,
    input.phase ?? "after",
    input.execution,
  );
}

export function validatePatchDataHookInput(
  input: PatchDataHookInput,
  availableEntities: readonly string[],
  existing?: Pick<CreateDataHookInput, "phase" | "trigger" | "execution">,
): void {
  const phase = input.phase ?? existing?.phase ?? "after";
  const execution = input.execution ?? existing?.execution;

  if (input.trigger) {
    validateDataHookTrigger(input.trigger, phase);
  }
  if (input.condition !== undefined) {
    validateHookCondition(input.condition);
  }
  if (input.actions) {
    validateDataHookActions(input.actions, availableEntities);
    validateCreateRecordsInActions(input.actions, phase, execution);
  }
}
