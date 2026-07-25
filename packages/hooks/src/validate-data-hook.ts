import {
  actionTargetEntities,
  isEmailTrigger,
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
import {
  collectFormulaNames,
  isArrayLiteralNode,
  walkExpressionNodes,
} from "./expression.js";
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

function validateFormulaNames(
  names: readonly string[],
  available: ReadonlySet<string>,
): void {
  for (const name of names) {
    if (!available.has(name)) {
      throw new HookExecutionError(
        `Expression references unknown formula "${name}".`,
      );
    }
  }
}

function validateExpressionReferences(
  node: ExpressionNode,
  availableLoaded: ReadonlySet<string>,
  availableAggregates: ReadonlySet<string>,
  availableFormulas: ReadonlySet<string>,
): void {
  rejectArrayLiteralsInExpression(node);
  validateLoadedAliases(collectLoadedAliases(node), availableLoaded);
  validateAggregateAliases(collectAggregateAliases(node), availableAggregates);
  validateFormulaNames(collectFormulaNames(node), availableFormulas);
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

function validateLoadedAliases(
  aliases: readonly string[],
  available: ReadonlySet<string>,
): void {
  for (const alias of aliases) {
    if (!available.has(alias)) {
      throw new HookExecutionError(
        `Expression references unknown loaded alias "${alias}". Add a prior action that loads as="${alias}".`,
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

function validateConditionExpressions(
  condition: DataHookConditionNode,
  availableLoaded: ReadonlySet<string>,
  availableAggregates: ReadonlySet<string>,
  availableFormulas: ReadonlySet<string>,
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
      validateFormulaNames(collectFormulaNames(leaf.value), availableFormulas);
    }
  });
}

function validateActionExpressions(
  action: DataHookAction,
  availableLoaded: ReadonlySet<string>,
  availableAggregates: ReadonlySet<string>,
  availableFormulas: ReadonlySet<string>,
): void {
  switch (action.type) {
    case "setField":
      validateExpressionReferences(
        action.value,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      return;
    case "createRecord":
      for (const node of Object.values(action.data)) {
        validateExpressionReferences(
          node,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "createRecords":
      validateExpressionReferences(
        action.count,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      if (action.startIndex) {
        validateExpressionReferences(
          action.startIndex,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      for (const node of Object.values(action.data)) {
        validateExpressionReferences(
          node,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "updateMatching":
      for (const node of Object.values(action.set)) {
        validateExpressionReferences(
          node,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "deleteRecord":
    case "getRecord":
      validateExpressionReferences(
        action.id,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      return;
    case "getOrCreateRecord":
      if (action.data) {
        for (const node of Object.values(action.data)) {
          validateExpressionReferences(
            node,
            availableLoaded,
            availableAggregates,
            availableFormulas,
          );
        }
      }
      return;
    case "matchRelatedRecord":
      validateExpressionReferences(
        action.haystack,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      return;
    case "sendNotification":
      validateExpressionReferences(
        action.message,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      if (action.recordEntity) {
        validateExpressionReferences(
          action.recordEntity,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.recordId) {
        validateExpressionReferences(
          action.recordId,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "callWebhook":
      validateExpressionReferences(
        action.url,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      if (action.body) {
        validateExpressionReferences(
          action.body,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "callAi":
      validateExpressionReferences(
        action.prompt,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      if (action.systemInstruction) {
        validateExpressionReferences(
          action.systemInstruction,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.when) {
        validateExpressionReferences(
          action.when,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "computeEmbedding":
      validateExpressionReferences(
        action.text,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      return;
    case "computeRecordAiSummary":
      if (action.entityName) {
        validateExpressionReferences(
          action.entityName,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.when) {
        validateExpressionReferences(
          action.when,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "upsertAiRecordContext":
      if (action.entityName) {
        validateExpressionReferences(
          action.entityName,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.recordId) {
        validateExpressionReferences(
          action.recordId,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      validateExpressionReferences(
        action.context,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
      if (action.ragText) {
        validateExpressionReferences(
          action.ragText,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.narrativePrompt) {
        validateExpressionReferences(
          action.narrativePrompt,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.narrativeSystemInstruction) {
        validateExpressionReferences(
          action.narrativeSystemInstruction,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.when) {
        validateExpressionReferences(
          action.when,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "enqueueAiRecordNarrative":
      if (action.entityName) {
        validateExpressionReferences(
          action.entityName,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.recordId) {
        validateExpressionReferences(
          action.recordId,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.prompt) {
        validateExpressionReferences(
          action.prompt,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.systemInstruction) {
        validateExpressionReferences(
          action.systemInstruction,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      if (action.when) {
        validateExpressionReferences(
          action.when,
          availableLoaded,
          availableAggregates,
          availableFormulas,
        );
      }
      return;
    case "matchSimilarRecord":
      validateExpressionReferences(
        action.haystack,
        availableLoaded,
        availableAggregates,
        availableFormulas,
      );
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
      `Duplicate binding alias "${alias}". Each loaded-result or aggregate alias must be unique.`,
    );
  }
  boundAliases.add(alias);
}

export function validateDataHookActions(
  actions: readonly DataHookAction[],
  availableEntities: readonly string[],
  options?: {
    readonly availableFormulaNames?: ReadonlySet<string>;
  },
): void {
  const boundAliases = new Set<string>();
  const loadedAliases = new Set<string>();
  const aggregateAliases = new Set<string>();
  const availableFormulas = options?.availableFormulaNames ?? new Set<string>();
  let loadedRecordCount = 0;
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
      action.type === "aggregateMatching" ||
      action.type === "getOrCreateRecord" ||
      action.type === "matchRelatedRecord" ||
      action.type === "matchSimilarRecord"
    ) {
      validateUpdateMatchingWhere(
        action.where,
        loadedAliases,
        aggregateAliases,
        availableFormulas,
      );
    }

    if (action.type === "aggregateMatching" && action.op !== "count") {
      if (!action.field || action.field.trim().length === 0) {
        throw new HookExecutionError(
          `aggregateMatching ${action.op} requires a non-empty field name.`,
        );
      }
    }

    validateActionExpressions(
      action,
      loadedAliases,
      aggregateAliases,
      availableFormulas,
    );

    if (
      action.type === "getRecord" ||
      action.type === "getOrCreateRecord" ||
      action.type === "matchRelatedRecord" ||
      action.type === "matchSimilarRecord" ||
      action.type === "callAi" ||
      action.type === "computeEmbedding" ||
      action.type === "computeRecordAiSummary" ||
      action.type === "upsertAiRecordContext" ||
      action.type === "enqueueAiRecordNarrative"
    ) {
      // Alias-producing actions always register bindings; only entity/AI loads
      // that pull records or model payloads count toward MAX_LOADED_RECORDS.
      const countsTowardLoadedLimit =
        action.type === "getRecord" ||
        action.type === "getOrCreateRecord" ||
        action.type === "matchRelatedRecord" ||
        action.type === "matchSimilarRecord" ||
        action.type === "callAi" ||
        action.type === "computeEmbedding";
      if (countsTowardLoadedLimit) {
        loadedRecordCount += 1;
        if (loadedRecordCount > MAX_LOADED_RECORDS) {
          throw new HookExecutionError(
            `Hook exceeds the maximum of ${MAX_LOADED_RECORDS} loaded-result actions.`,
          );
        }
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

function validateUpdateMatchingWhere(
  where: DataHookConditionNode,
  loadedAliases: ReadonlySet<string>,
  aggregateAliases: ReadonlySet<string>,
  availableFormulas: ReadonlySet<string>,
): void {
  if (!hasUpdateMatchingLookupLeaf(where)) {
    throw new HookExecutionError(
      "Matching where must include at least one == leaf with a value expression for lookup.",
    );
  }
  validateConditionExpressions(
    where,
    loadedAliases,
    aggregateAliases,
    availableFormulas,
  );
}

export function validateDataHookCondition(
  condition: DataHookConditionNode,
  options?: {
    readonly availableFormulaNames?: ReadonlySet<string>;
  },
): void {
  validateConditionExpressions(
    condition,
    new Set(),
    new Set(),
    options?.availableFormulaNames ?? new Set(),
  );
}

function validateDataHookTrigger(
  trigger: DataHookTrigger,
  phase: CreateDataHookInput["phase"] | PatchDataHookInput["phase"],
): void {
  if (isEmailTrigger(trigger)) {
    if (phase === "before") {
      throw new HookExecutionError("Email hooks must use after phase.");
    }
    return;
  }

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
    validateUpdateMatchingWhere(
      trigger.eachRecordWhere,
      new Set(),
      new Set(),
      new Set(),
    );
  }
}

function validateHookCondition(
  condition: DataHookConditionNode | null | undefined,
  availableFormulaNames?: ReadonlySet<string>,
): void {
  if (condition) {
    validateDataHookCondition(condition, { availableFormulaNames });
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
  options?: {
    readonly availableFormulaNames?: ReadonlySet<string>;
  },
): void {
  validateDataHookEntity(input.entity, availableEntities);
  validateDataHookTrigger(input.trigger, input.phase);
  validateHookCondition(input.condition, options?.availableFormulaNames);
  validateDataHookActions(input.actions, availableEntities, options);
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
  options?: {
    readonly availableFormulaNames?: ReadonlySet<string>;
  },
): void {
  const phase = input.phase ?? existing?.phase ?? "after";
  const execution = input.execution ?? existing?.execution;

  if (input.trigger) {
    validateDataHookTrigger(input.trigger, phase);
  }
  if (input.condition !== undefined) {
    validateHookCondition(input.condition, options?.availableFormulaNames);
  }
  if (input.actions) {
    validateDataHookActions(input.actions, availableEntities, options);
    validateCreateRecordsInActions(input.actions, phase, execution);
  }
}
