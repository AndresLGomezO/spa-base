import type {
  DataHookAction,
  DataHookCondition,
  DataHookConditionNode,
  DataHookDefinition,
  DataHookExecutionMode,
} from "./data-hook-definition.js";
import { isEmailTrigger, isScheduleTrigger } from "./data-hook-definition.js";
import { computeAggregateMatching } from "./aggregate-matching-utils.js";
import {
  assertCreateRecordsRuntimeCount,
  coerceNonNegativeInteger,
} from "./create-records-utils.js";
import type {
  CreateDataHookExecutionInput,
  DataHookExecutionRecorder,
} from "./data-hook-execution.js";
import { actionTargetEntities } from "./data-hook-definition.js";
import {
  appendActionTraceEntry,
  buildExecutionMetricsSnapshot,
  HookWriteMetricsCollector,
  wrapHookEntityServicesWithMetrics,
  type DataHookActionTraceEntry,
} from "./hook-execution-metrics.js";
import { buildDataHookJobPayload } from "./data-hook-job.js";
import { isBeforePhase, parseHookEvent } from "./event.js";
import { listMatchingRecordsForWhere } from "./update-matching-utils.js";
import {
  evaluateExpression,
  expressionValuesEqual,
  isEmptyExpressionValue,
  type ExpressionNode,
  type ExpressionScope,
  type ExpressionValue,
} from "./expression.js";
import type {
  HookContext,
  HookEntityWriteOptions,
  HookPhase,
} from "./types.js";
import { HookExecutionError } from "./types.js";

function requireAfterPhase(phase: HookPhase, actionType: string): void {
  if (isBeforePhase(phase)) {
    throw new HookExecutionError(
      `${actionType} is only supported in after-phase hooks.`,
    );
  }
}

/**
 * Re-entrancy guard for opt-in nested/chained hooks. Hook-initiated writes are
 * non-re-entrant by default (services write directly), so `context.depth`
 * normally stays 0; this cap prevents runaway recursion if nested dispatch is
 * ever enabled.
 */
const MAX_HOOK_DEPTH = 5;

function buildScope(
  context: HookContext,
  loopIndex?: number,
  loopVars?: { readonly loopState?: number },
  formulaResultCache?: Map<string, ExpressionValue>,
): ExpressionScope {
  return {
    current: context.current,
    ...(context.previous ? { previous: context.previous } : {}),
    ...(context.loaded ? { loaded: context.loaded } : {}),
    ...(context.aggregates ? { aggregates: context.aggregates } : {}),
    now: new Date(),
    tenantId: context.tenantId,
    ...(context.formulaResolver
      ? { formulaResolver: context.formulaResolver }
      : {}),
    ...(context.user.uid ? { userId: context.user.uid } : {}),
    ...(loopIndex !== undefined ? { loopIndex } : {}),
    ...(loopVars?.loopState !== undefined
      ? { loopState: loopVars.loopState }
      : {}),
    ...(formulaResultCache ? { formulaResultCache } : {}),
  };
}

function tryCoerceNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

/** Strip hook-internal `__*` fields from createRecords payloads before entity write. */
function omitInternalLoopFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith("__")) {
      record[key] = value;
    }
  }
  return record;
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

function omitNullishRecordValues(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(record)) {
    if (value != null) {
      output[field] = value;
    }
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
  if (
    isScheduleTrigger(definition.trigger) ||
    isEmailTrigger(definition.trigger)
  ) {
    return true;
  }

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

interface DataHookActionMeta {
  readonly hookId: string;
  readonly hookName: string;
}

interface HookExecutionInstrumentation {
  readonly writeMetrics: HookWriteMetricsCollector;
  readonly actionTrace: DataHookActionTraceEntry[];
}

function prepareHookRunContext(context: HookContext): {
  readonly context: HookContext;
  readonly instrumentation: HookExecutionInstrumentation;
} {
  const writeMetrics = new HookWriteMetricsCollector();
  const actionTrace: DataHookActionTraceEntry[] = [];
  const instrumentation = { writeMetrics, actionTrace };
  const entities = context.services.entities
    ? wrapHookEntityServicesWithMetrics(context.services.entities, writeMetrics)
    : undefined;

  return {
    instrumentation,
    context: {
      ...context,
      executionInstrumentation: instrumentation,
      services: {
        ...context.services,
        ...(entities ? { entities } : {}),
      },
    },
  };
}

function recordActionTrace(
  context: HookContext,
  action: DataHookAction,
  scope: ExpressionScope,
  durationMs: number,
  error?: string,
): void {
  const trace = context.executionInstrumentation?.actionTrace;
  if (!trace) {
    return;
  }

  const targetEntities = actionTargetEntities(action);
  let count: number | undefined;
  if (action.type === "createRecords") {
    count = coerceNonNegativeInteger(
      evaluateExpression(action.count, scope),
      "count",
    );
  }

  appendActionTraceEntry(trace, {
    type: action.type,
    ...(targetEntities[0] ? { entity: targetEntities[0] } : {}),
    ...(count != null ? { count } : {}),
    durationMs,
    ...(error ? { error } : {}),
  });
}

async function runAction(
  action: DataHookAction,
  context: HookContext,
  phase: HookPhase,
  execution: DataHookExecutionMode | undefined,
  hookMeta: DataHookActionMeta,
  writeOptions?: HookEntityWriteOptions,
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
      const patch = omitNullishRecordValues({ [action.field]: value });
      if (Object.keys(patch).length > 0) {
        await entities.update(
          context.entityName,
          context.current.id,
          patch,
          writeOptions,
        );
      }
      if (value != null) {
        context.current[action.field] = value;
      }
      return;
    }

    case "createRecord": {
      const entities = requireEntities(context);
      await entities.create(
        action.entity,
        evaluateExpressionRecord(action.data, scope),
        writeOptions,
      );
      return;
    }

    case "createRecords": {
      const entities = requireEntities(context);
      const rawCount = evaluateExpression(action.count, scope);
      const count = coerceNonNegativeInteger(rawCount, "count");
      assertCreateRecordsRuntimeCount(count, phase, execution);
      const rawStartIndex = action.startIndex
        ? evaluateExpression(action.startIndex, scope)
        : 0;
      const startIndex = coerceNonNegativeInteger(rawStartIndex, "startIndex");
      let runningLoopState: number | undefined;
      const formulaResultCache = new Map<string, ExpressionValue>();
      const pending: Record<string, unknown>[] = [];
      for (let index = 0; index < count; index += 1) {
        const loopIndex = startIndex + index;
        const loopScope = buildScope(
          context,
          loopIndex,
          runningLoopState !== undefined
            ? { loopState: runningLoopState }
            : undefined,
          formulaResultCache,
        );
        const data = evaluateExpressionRecord(action.data, loopScope);
        const nextLoopState = data.__loopState;
        if (nextLoopState !== undefined) {
          runningLoopState = tryCoerceNumber(nextLoopState);
        }
        pending.push(omitInternalLoopFields(data));
      }

      if (pending.length === 1) {
        await entities.create(action.entity, pending[0]!, writeOptions);
      } else if (pending.length > 1) {
        await entities.createMany(action.entity, pending, writeOptions);
      }
      return;
    }

    case "updateMatching": {
      const entities = requireEntities(context);
      const matches = await listMatchingRecordsForWhere(
        action.entity,
        action.where,
        context,
        scope,
        entities.list,
      );
      const triggerRecord = context.current;
      for (const match of matches) {
        const setScope: ExpressionScope = {
          current: match as Record<string, unknown>,
          previous: triggerRecord,
          ...(context.loaded ? { loaded: context.loaded } : {}),
          ...(context.aggregates ? { aggregates: context.aggregates } : {}),
          now: new Date(),
          tenantId: context.tenantId,
          ...(context.formulaResolver
            ? { formulaResolver: context.formulaResolver }
            : {}),
          ...(context.user.uid ? { userId: context.user.uid } : {}),
        };
        const patch = omitNullishRecordValues(
          evaluateExpressionRecord(action.set, setScope),
        );
        if (Object.keys(patch).length === 0) {
          continue;
        }
        await entities.update(action.entity, match.id, patch, writeOptions);
      }
      return;
    }

    case "deleteMatching": {
      requireAfterPhase(phase, "deleteMatching");
      const entities = requireEntities(context);
      const matches = await listMatchingRecordsForWhere(
        action.entity,
        action.where,
        context,
        scope,
        entities.list,
      );
      for (const match of matches) {
        await entities.delete(action.entity, match.id, writeOptions);
      }
      return;
    }

    case "deleteRecord": {
      requireAfterPhase(phase, "deleteRecord");
      const entities = requireEntities(context);
      const idValue = evaluateExpression(action.id, scope);
      if (typeof idValue !== "string" || idValue.trim().length === 0) {
        throw new HookExecutionError(
          "deleteRecord id must evaluate to a non-empty string.",
        );
      }
      await entities.delete(action.entity, idValue.trim(), writeOptions);
      return;
    }

    case "getRecord": {
      const entities = requireEntities(context);
      const idValue = evaluateExpression(action.id, scope);
      if (typeof idValue !== "string" || idValue.trim().length === 0) {
        throw new HookExecutionError(
          "getRecord id must evaluate to a non-empty string.",
        );
      }
      const record = await entities.get(action.entity, idValue.trim());
      if (!context.loaded) {
        context.loaded = {};
      }
      context.loaded[action.as] = record;
      return;
    }

    case "aggregateMatching": {
      const entities = requireEntities(context);
      const matches = await listMatchingRecordsForWhere(
        action.entity,
        action.where,
        context,
        scope,
        entities.list,
      );
      const result = computeAggregateMatching(action.op, action.field, matches);
      if (!context.aggregates) {
        context.aggregates = {};
      }
      context.aggregates[action.as] = result;
      return;
    }

    case "sendNotification": {
      const message = evaluateExpression(action.message, scope);
      const text = message == null ? "" : String(message).trim();
      if (text.length === 0) {
        return;
      }

      const defaultRecordId =
        typeof context.current.id === "string" ? context.current.id : undefined;
      const notificationEntity =
        action.recordEntity != null
          ? String(evaluateExpression(action.recordEntity, scope) ?? "").trim()
          : context.entityName;
      const notificationRecordId =
        action.recordId != null
          ? String(evaluateExpression(action.recordId, scope) ?? "").trim()
          : defaultRecordId;

      context.services.logger?.info(text, {
        hookId: hookMeta.hookId,
        hookName: hookMeta.hookName,
        entityName: notificationEntity || context.entityName,
        event: context.event,
        tenantId: context.tenantId,
        action: "sendNotification",
        recordId: notificationRecordId,
      });

      const sendUserNotification = context.services.sendUserNotification;
      if (sendUserNotification && context.user.uid.trim().length > 0) {
        void sendUserNotification({
          userId: context.user.uid,
          message: text,
          level: "info",
          hookId: hookMeta.hookId,
          hookName: hookMeta.hookName,
          entityName: notificationEntity || context.entityName,
          event: context.event,
          ...(notificationRecordId ? { recordId: notificationRecordId } : {}),
          createdAt: new Date().toISOString(),
        }).catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to deliver user notification.";
          context.services.logger?.error(
            "Failed to deliver user notification",
            {
              hookId: hookMeta.hookId,
              entityName: context.entityName,
              event: context.event,
              error: message,
            },
          );
        });
      }
      return;
    }

    case "callWebhook": {
      const callWebhook = context.services.callWebhook;
      if (!callWebhook) {
        throw new HookExecutionError(
          "callWebhook service is not available for this hook execution.",
        );
      }
      const urlValue = evaluateExpression(action.url, scope);
      if (typeof urlValue !== "string" || urlValue.trim().length === 0) {
        throw new HookExecutionError(
          "callWebhook url must evaluate to a non-empty string.",
        );
      }
      let body: Record<string, unknown>;
      if (action.body) {
        const evaluated = evaluateExpression(action.body, scope);
        if (evaluated === null || Array.isArray(evaluated)) {
          throw new HookExecutionError(
            "callWebhook body must evaluate to a JSON object.",
          );
        }
        if (typeof evaluated !== "object") {
          throw new HookExecutionError(
            "callWebhook body must evaluate to a JSON object.",
          );
        }
        body = evaluated as unknown as Record<string, unknown>;
      } else {
        body = {
          tenantId: context.tenantId,
          entityName: context.entityName,
          event: context.event,
          current: context.current,
          ...(context.previous ? { previous: context.previous } : {}),
          user: { uid: context.user.uid },
        };
      }
      await callWebhook({ url: urlValue.trim(), body });
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

function buildExecutionBase(
  definition: DataHookDefinition,
  context: HookContext,
  parsed: ReturnType<typeof parseHookEvent>,
): Omit<
  CreateDataHookExecutionInput,
  "status" | "durationMs" | "startedAt" | "finishedAt" | "error"
> {
  return {
    hookId: definition.id,
    hookName: definition.name,
    entityName: context.entityName,
    event: context.event,
    phase: parsed.phase,
    operation: parsed.operation,
    ...(typeof context.current.id === "string"
      ? { recordId: context.current.id }
      : {}),
    executionMode: definition.execution ?? "sync",
    chainDepth: context.depth ?? 0,
    triggeredBy: { uid: context.user.uid },
  };
}

function buildExecutionMetrics(
  context: HookContext,
  instrumentation: HookExecutionInstrumentation,
): ReturnType<typeof buildExecutionMetricsSnapshot> {
  return buildExecutionMetricsSnapshot({
    chainDepth: context.depth ?? 0,
    writeMetrics: instrumentation.writeMetrics,
    actionTrace: instrumentation.actionTrace,
  });
}

function getExecutionRecorder(
  context: HookContext,
): DataHookExecutionRecorder | undefined {
  return context.services.dataHookExecutionRecorder;
}

async function safeRecorderCall(
  context: HookContext,
  hookId: string,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record execution.";
    context.services.logger?.error("Failed to record data hook execution", {
      hookId,
      entityName: context.entityName,
      event: context.event,
      error: message,
    });
  }
}

async function runDataHookCore(
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

  const visited = new Set(context.visitedHookIds ?? []);
  if (visited.has(definition.id)) {
    return;
  }
  visited.add(definition.id);

  const writeOptions: HookEntityWriteOptions | undefined =
    definition.chainHooks === true
      ? {
          chainHooks: true,
          depth: context.depth ?? 0,
          visitedHookIds: visited,
        }
      : undefined;

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
    const scope = buildScope(context);
    const startedAt = Date.now();
    try {
      await runAction(
        action,
        context,
        parsed.phase,
        definition.execution,
        {
          hookId: definition.id,
          hookName: definition.name,
        },
        writeOptions,
      );
      recordActionTrace(context, action, scope, Date.now() - startedAt);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Hook action failed.";
      recordActionTrace(
        context,
        action,
        scope,
        Date.now() - startedAt,
        message,
      );
      throw error;
    }
  }
}

export async function runDataHook(
  definition: DataHookDefinition,
  context: HookContext,
  options?: { readonly executionId?: string },
): Promise<void> {
  const { context: runContext, instrumentation } =
    prepareHookRunContext(context);
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();
  const parsed = parseHookEvent(runContext.event);
  const base = buildExecutionBase(definition, runContext, parsed);
  const recorder = getExecutionRecorder(runContext);
  let executionId = options?.executionId;
  const metricsSnapshot = () =>
    buildExecutionMetrics(runContext, instrumentation);

  const finishSkipped = async (error: string) => {
    if (!recorder) {
      return;
    }
    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startedAt;
    if (executionId) {
      const resolvedExecutionId = executionId;
      await safeRecorderCall(runContext, base.hookId, () =>
        recorder.finish({
          id: resolvedExecutionId,
          status: "skipped",
          error,
          durationMs,
          finishedAt,
          ...metricsSnapshot(),
        }),
      );
      return;
    }
    await safeRecorderCall(runContext, base.hookId, () =>
      recorder.createTerminal({
        ...base,
        ...metricsSnapshot(),
        startedAt: startedAtIso,
        status: "skipped",
        error,
        durationMs,
        finishedAt,
      }),
    );
  };

  if ((runContext.depth ?? 0) > MAX_HOOK_DEPTH) {
    runContext.services.logger?.error("Data hook depth limit exceeded", {
      entityName: runContext.entityName,
      event: runContext.event,
      depth: runContext.depth,
    });
    await finishSkipped("Hook depth limit exceeded.");
    return;
  }

  const visited = runContext.visitedHookIds ?? new Set<string>();
  if (visited.has(definition.id)) {
    await finishSkipped("Hook already visited in this chain.");
    return;
  }

  if (
    parsed.operation === "update" &&
    !updateFieldsChanged(definition, runContext)
  ) {
    await finishSkipped("No configured update fields changed.");
    return;
  }

  if (definition.condition) {
    const scope = buildScope(runContext);
    if (!evaluateConditionNode(definition.condition, runContext, scope)) {
      await finishSkipped("Condition evaluated to false.");
      return;
    }
  }

  if (recorder) {
    const begun = await recorder
      .beginRunning({ ...base, startedAt: startedAtIso }, executionId)
      .catch((error: unknown) => {
        void safeRecorderCall(runContext, base.hookId, async () => {
          throw error;
        });
        return null;
      });
    if (begun) {
      executionId = begun.id;
    }
  }

  try {
    await runDataHookCore(definition, runContext);
    const finishedAt = Date.now();
    if (recorder && executionId) {
      const resolvedExecutionId = executionId;
      await safeRecorderCall(runContext, base.hookId, () =>
        recorder.finish({
          id: resolvedExecutionId,
          status: "success",
          durationMs: finishedAt - startedAt,
          finishedAt: new Date(finishedAt).toISOString(),
          ...metricsSnapshot(),
        }),
      );
    }
  } catch (error) {
    const finishedAt = Date.now();
    const message =
      error instanceof Error ? error.message : "Data hook execution failed.";
    if (recorder && executionId) {
      const resolvedExecutionId = executionId;
      await safeRecorderCall(runContext, base.hookId, () =>
        recorder.finish({
          id: resolvedExecutionId,
          status: "error",
          error: message,
          durationMs: finishedAt - startedAt,
          finishedAt: new Date(finishedAt).toISOString(),
          ...metricsSnapshot(),
        }),
      );
    }
    throw error;
  }
}

export function compileDataHook(
  definition: DataHookDefinition,
): (context: HookContext) => Promise<void> {
  if (definition.execution === "queued" && definition.phase === "after") {
    return async (context) => {
      const enqueue = context.services.enqueueDataHookJob;
      if (enqueue) {
        const parsed = parseHookEvent(context.event);
        const base = buildExecutionBase(definition, context, parsed);
        const startedAtIso = new Date().toISOString();
        const recorder = getExecutionRecorder(context);
        let executionId: string | undefined;
        if (recorder) {
          const pending = await recorder
            .createPending({
              ...base,
              startedAt: startedAtIso,
            })
            .catch((error: unknown) => {
              void safeRecorderCall(context, definition.id, async () => {
                throw error;
              });
              return null;
            });
          executionId = pending?.id;
        }
        await enqueue(
          buildDataHookJobPayload(definition, context, executionId),
        );
        return;
      }

      context.services.logger?.info(
        "Queued data hook missing enqueue service; falling back to deferred execution",
        {
          hookId: definition.id,
          hookName: definition.name,
          entityName: context.entityName,
          event: context.event,
        },
      );
      void runDataHook(definition, context).catch((error) => {
        const message =
          error instanceof Error ? error.message : "Deferred data hook failed.";
        context.services.logger?.error("Deferred data hook failed", {
          hookId: definition.id,
          hookName: definition.name,
          entityName: context.entityName,
          event: context.event,
          error: message,
        });
      });
    };
  }

  if (definition.execution === "deferred" && definition.phase === "after") {
    return async (context) => {
      void runDataHook(definition, context).catch((error) => {
        const message =
          error instanceof Error ? error.message : "Deferred data hook failed.";
        context.services.logger?.error("Deferred data hook failed", {
          hookId: definition.id,
          hookName: definition.name,
          entityName: context.entityName,
          event: context.event,
          error: message,
        });
      });
    };
  }

  return (context) => runDataHook(definition, context);
}
