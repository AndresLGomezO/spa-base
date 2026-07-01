import { z } from "zod";

import { expressionNodeSchema } from "./expression.js";

export const DATA_HOOKS_COLLECTION = "__data_hooks" as const;

export const DATA_HOOK_OPERATIONS = ["create", "update", "delete"] as const;
export type DataHookOperation = (typeof DATA_HOOK_OPERATIONS)[number];

export const DATA_HOOK_PHASES = ["before", "after"] as const;
export type DataHookPhase = (typeof DATA_HOOK_PHASES)[number];

export const DATA_HOOK_EXECUTION_MODES = [
  "sync",
  "deferred",
  "queued",
] as const;
export type DataHookExecutionMode = (typeof DATA_HOOK_EXECUTION_MODES)[number];

export const DATA_HOOK_CONDITION_OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "notIn",
  "isEmpty",
  "isNotEmpty",
  "changed",
] as const;
export type DataHookConditionOperator =
  (typeof DATA_HOOK_CONDITION_OPERATORS)[number];

/** Operators that do not require a comparison value. */
export const VALUELESS_CONDITION_OPERATORS: readonly DataHookConditionOperator[] =
  ["isEmpty", "isNotEmpty", "changed"];

export const dataHookTriggerSchema = z.object({
  operation: z.enum(DATA_HOOK_OPERATIONS),
  /**
   * For update triggers, the hook only runs when at least one of these fields
   * changed. Empty/omitted means "any field change".
   */
  updateFields: z.array(z.string().trim().min(1)).optional(),
});
export type DataHookTrigger = z.infer<typeof dataHookTriggerSchema>;

/** Single-field lookup / compare leaf (used by `updateMatching.where`). */
export const dataHookConditionSchema = z.object({
  field: z.string().trim().min(1),
  operator: z.enum(DATA_HOOK_CONDITION_OPERATORS),
  value: expressionNodeSchema.optional(),
});
export type DataHookCondition = z.infer<typeof dataHookConditionSchema>;

export const DATA_HOOK_CONDITION_COMBINATORS = ["and", "or"] as const;
export type DataHookConditionCombinator =
  (typeof DATA_HOOK_CONDITION_COMBINATORS)[number];

export const dataHookConditionLeafSchema = z.object({
  type: z.literal("condition"),
  field: z.string().trim().min(1),
  operator: z.enum(DATA_HOOK_CONDITION_OPERATORS),
  value: expressionNodeSchema.optional(),
});
export type DataHookConditionLeaf = z.infer<typeof dataHookConditionLeafSchema>;

export type DataHookConditionGroup = {
  readonly type: "group";
  readonly combinator: DataHookConditionCombinator;
  readonly children: readonly DataHookConditionNode[];
};

export type DataHookConditionNode =
  | DataHookConditionLeaf
  | DataHookConditionGroup;

export const dataHookConditionGroupSchema = z.object({
  type: z.literal("group"),
  combinator: z.enum(DATA_HOOK_CONDITION_COMBINATORS),
  children: z.array(z.lazy(() => dataHookConditionNodeSchema)),
});

export const dataHookConditionNodeSchema: z.ZodType<DataHookConditionNode> =
  z.lazy(() =>
    z.discriminatedUnion("type", [
      dataHookConditionLeafSchema,
      dataHookConditionGroupSchema,
    ]),
  );

function coerceLegacyConditionNode(value: unknown): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (record.type === "condition" || record.type === "group") {
    return value;
  }
  if (typeof record.field === "string" && typeof record.operator === "string") {
    return { type: "condition", ...record };
  }
  return value;
}

export const dataHookDefinitionConditionSchema = z.preprocess(
  coerceLegacyConditionNode,
  dataHookConditionNodeSchema.nullable().optional(),
);

const expressionRecordSchema = z.record(z.string(), expressionNodeSchema);

export const dataHookActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("setField"),
    field: z.string().trim().min(1),
    value: expressionNodeSchema,
  }),
  z.object({
    type: z.literal("createRecord"),
    entity: z.string().trim().min(1),
    data: expressionRecordSchema,
  }),
  z.object({
    type: z.literal("createRecords"),
    entity: z.string().trim().min(1),
    count: expressionNodeSchema,
    data: expressionRecordSchema,
  }),
  z.object({
    type: z.literal("updateMatching"),
    entity: z.string().trim().min(1),
    where: dataHookConditionSchema,
    set: expressionRecordSchema,
  }),
  z.object({
    type: z.literal("sendNotification"),
    message: expressionNodeSchema,
  }),
  z.object({
    type: z.literal("callWebhook"),
    url: expressionNodeSchema,
    body: expressionNodeSchema.optional(),
  }),
]);
export type DataHookAction = z.infer<typeof dataHookActionSchema>;

export const dataHookDefinitionSchema = z.object({
  id: z.string().trim().min(1),
  tenantId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  entity: z.string().trim().min(1),
  phase: z.enum(DATA_HOOK_PHASES),
  trigger: dataHookTriggerSchema,
  condition: dataHookDefinitionConditionSchema,
  actions: z.array(dataHookActionSchema).min(1),
  enabled: z.boolean(),
  order: z.number().int(),
  /**
   * When true, entity writes from this hook's actions may trigger hooks on
   * target entities (opt-in chained execution).
   */
  chainHooks: z.boolean().optional(),
  /**
   * After-phase only. `deferred` runs the hook outside the request path
   * (in-process fire-and-forget).
   */
  execution: z.enum(DATA_HOOK_EXECUTION_MODES).optional(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});
export type DataHookDefinition = z.infer<typeof dataHookDefinitionSchema>;

export const createDataHookInputSchema = dataHookDefinitionSchema
  .omit({
    id: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tenantId: z.string().trim().min(1).optional(),
    phase: z.enum(DATA_HOOK_PHASES).optional(),
    condition: dataHookDefinitionConditionSchema,
    enabled: z.boolean().optional(),
    order: z.number().int().optional(),
    chainHooks: z.boolean().optional(),
    execution: z.enum(DATA_HOOK_EXECUTION_MODES).optional(),
  });
export type CreateDataHookInput = z.infer<typeof createDataHookInputSchema>;

export const patchDataHookInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  phase: z.enum(DATA_HOOK_PHASES).optional(),
  trigger: dataHookTriggerSchema.optional(),
  condition: dataHookDefinitionConditionSchema,
  actions: z.array(dataHookActionSchema).min(1).optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
  chainHooks: z.boolean().optional(),
  execution: z.enum(DATA_HOOK_EXECUTION_MODES).optional(),
});
export type PatchDataHookInput = z.infer<typeof patchDataHookInputSchema>;

/** Collect entity names referenced by an action's target (for validation). */
export function actionTargetEntities(
  action: DataHookAction,
): readonly string[] {
  switch (action.type) {
    case "createRecord":
    case "createRecords":
    case "updateMatching":
      return [action.entity];
    case "setField":
    case "sendNotification":
    case "callWebhook":
      return [];
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
