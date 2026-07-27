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
  "contains",
  "isEmpty",
  "isNotEmpty",
  "changed",
] as const;
export type DataHookConditionOperator =
  (typeof DATA_HOOK_CONDITION_OPERATORS)[number];

/** Operators that do not require a comparison value. */
export const VALUELESS_CONDITION_OPERATORS: readonly DataHookConditionOperator[] =
  ["isEmpty", "isNotEmpty", "changed"];

export const DATA_HOOK_TRIGGER_KINDS = ["crud", "schedule", "email"] as const;
export type DataHookTriggerKind = (typeof DATA_HOOK_TRIGGER_KINDS)[number];

export const DATA_HOOK_SCHEDULE_SCOPES = ["once", "eachRecord"] as const;
export type DataHookScheduleScope = (typeof DATA_HOOK_SCHEDULE_SCOPES)[number];

/** Job payload and event dispatch include schedule/email alongside CRUD operations. */
export const DATA_HOOK_JOB_OPERATIONS = [
  ...DATA_HOOK_OPERATIONS,
  "schedule",
  "email",
] as const;
export type DataHookJobOperation = (typeof DATA_HOOK_JOB_OPERATIONS)[number];

export const dataHookCrudOperationEntrySchema = z.object({
  operation: z.enum(DATA_HOOK_OPERATIONS),
  /**
   * For update entries, the hook only runs when at least one of these fields
   * changed. Empty/omitted means "any field change".
   */
  updateFields: z.array(z.string().trim().min(1)).optional(),
});
export type DataHookCrudOperationEntry = {
  readonly operation: DataHookOperation;
  readonly updateFields?: readonly string[];
};

/**
 * CRUD trigger: either a single `operation` (legacy) or `operations[]` for
 * one definition registered on multiple create/update/delete events.
 */
export const dataHookCrudTriggerSchema = z
  .object({
    kind: z.literal("crud"),
    operation: z.enum(DATA_HOOK_OPERATIONS).optional(),
    /**
     * Legacy single-operation updateFields. Only valid with `operation`.
     */
    updateFields: z.array(z.string().trim().min(1)).optional(),
    operations: z.array(dataHookCrudOperationEntrySchema).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const hasOperation = value.operation != null;
    const hasOperations = (value.operations?.length ?? 0) > 0;
    if (hasOperation === hasOperations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "CRUD trigger requires exactly one of `operation` or `operations`.",
        path: hasOperations ? ["operations"] : ["operation"],
      });
    }
    if (hasOperations && value.updateFields != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "`updateFields` on the trigger root is only valid with a single `operation`. Put updateFields on each operations[] entry instead.",
        path: ["updateFields"],
      });
    }
  });
export type DataHookCrudTrigger = {
  readonly kind?: "crud";
  readonly operation?: DataHookOperation;
  readonly updateFields?: readonly string[];
  readonly operations?: readonly DataHookCrudOperationEntry[];
};

export type DataHookScheduleTrigger = {
  readonly kind: "schedule";
  readonly cron: string;
  readonly timezone?: string;
  readonly scope?: DataHookScheduleScope;
  readonly eachRecordWhere?: DataHookConditionNode;
  /**
   * When set on an eachRecord schedule hook, `callAi` invocations are batched
   * (and memoized by cacheKey) up to this many distinct keys per Vertex call.
   */
  readonly aiBatchSize?: number;
};

export type DataHookEmailTrigger = {
  readonly kind: "email";
  /**
   * When non-empty, only these email-match binding ids fire the hook.
   * Omit or empty means any matching binding for the hook entity.
   */
  readonly bindingIds?: readonly string[];
};

export type DataHookTrigger =
  | DataHookCrudTrigger
  | DataHookScheduleTrigger
  | DataHookEmailTrigger;

function coerceTriggerKind(value: unknown): unknown {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (
    record.kind === "schedule" ||
    record.kind === "crud" ||
    record.kind === "email"
  ) {
    return value;
  }
  if (typeof record.cron === "string") {
    return { kind: "schedule", ...record };
  }
  if (
    typeof record.operation === "string" ||
    Array.isArray(record.operations)
  ) {
    return { kind: "crud", ...record };
  }
  return { kind: "crud", ...record };
}

/** Single-field compare leaf (legacy `updateMatching.where` and shared condition shape). */
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

export const dataHookScheduleTriggerSchema = z.object({
  kind: z.literal("schedule"),
  cron: z.string().trim().min(1),
  timezone: z.string().trim().min(1).optional(),
  scope: z.enum(DATA_HOOK_SCHEDULE_SCOPES).optional(),
  eachRecordWhere: z
    .preprocess(
      coerceLegacyConditionNode,
      dataHookConditionNodeSchema.optional(),
    )
    .optional(),
  aiBatchSize: z.number().int().min(1).max(50).optional(),
});

export const dataHookEmailTriggerSchema = z.object({
  kind: z.literal("email"),
  bindingIds: z.array(z.string().trim().min(1)).optional(),
});

export const dataHookTriggerSchema = z.preprocess(
  coerceTriggerKind,
  z.union([
    dataHookCrudTriggerSchema,
    dataHookScheduleTriggerSchema,
    dataHookEmailTriggerSchema,
  ]),
);

export function isScheduleTrigger(
  trigger: DataHookTrigger,
): trigger is DataHookScheduleTrigger {
  return trigger.kind === "schedule";
}

export function isEmailTrigger(
  trigger: DataHookTrigger,
): trigger is DataHookEmailTrigger {
  return trigger.kind === "email";
}

export function isCrudTrigger(
  trigger: DataHookTrigger,
): trigger is DataHookCrudTrigger {
  return trigger.kind !== "schedule" && trigger.kind !== "email";
}

/** Normalized CRUD operation entries for registration and updateFields gates. */
export function listCrudOperations(
  trigger: DataHookCrudTrigger,
): readonly DataHookCrudOperationEntry[] {
  if (trigger.operations && trigger.operations.length > 0) {
    return trigger.operations;
  }
  if (trigger.operation) {
    return [
      {
        operation: trigger.operation,
        ...(trigger.updateFields ? { updateFields: trigger.updateFields } : {}),
      },
    ];
  }
  return [];
}

/** updateFields for the operation that is currently firing, if any. */
export function resolveCrudUpdateFields(
  trigger: DataHookCrudTrigger,
  operation: DataHookOperation,
): readonly string[] | undefined {
  const entry = listCrudOperations(trigger).find(
    (item) => item.operation === operation,
  );
  return entry?.updateFields;
}

/**
 * Whether an email trigger should run for a matched binding id.
 * Omit/empty `bindingIds` means any binding (current default behavior).
 */
export function emailTriggerAppliesToBinding(
  trigger: DataHookEmailTrigger,
  bindingId: string,
): boolean {
  const ids = trigger.bindingIds;
  if (ids == null || ids.length === 0) {
    return true;
  }
  return ids.includes(bindingId);
}

export const dataHookUpdateMatchingWhereSchema = z.preprocess(
  coerceLegacyConditionNode,
  dataHookConditionNodeSchema,
);
export type DataHookUpdateMatchingWhere = DataHookConditionNode;
export type DataHookUpdateMatchingWhereInput =
  | DataHookConditionNode
  | DataHookCondition;

const expressionRecordSchema = z.record(z.string(), expressionNodeSchema);

/** Max actions that load a result under an alias per hook definition. */
export const MAX_LOADED_RECORDS = 8;

/** Alias pattern for loaded field references. */
export const DATA_HOOK_LOADED_ALIAS_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;

/** Max entity names that `callAi.includeEntities` may request for prompt context. */
export const MAX_CALL_AI_INCLUDE_ENTITIES = 3;

/** Default cosine threshold for `matchSimilarRecord` when `minScore` is omitted. */
export const DEFAULT_MATCH_SIMILAR_MIN_SCORE = 0.82;

export const DATA_HOOK_AGGREGATE_OPERATORS = [
  "count",
  "sum",
  "min",
  "max",
  "avg",
] as const;
export type DataHookAggregateOperator =
  (typeof DATA_HOOK_AGGREGATE_OPERATORS)[number];

/** Max `aggregateMatching` actions per hook definition. */
export const MAX_AGGREGATE_ACTIONS = 8;

/** Max `createRecords` iterations per hook run (before/sync/deferred). */
export const MAX_CREATE_RECORDS = 1_000;

/** Max `createRecords` iterations for after-phase queued hooks. */
export const MAX_CREATE_RECORDS_QUEUED = 5_000;

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
    startIndex: expressionNodeSchema.optional(),
    data: expressionRecordSchema,
  }),
  z.object({
    type: z.literal("updateMatching"),
    entity: z.string().trim().min(1),
    where: dataHookUpdateMatchingWhereSchema,
    set: expressionRecordSchema,
    /**
     * When no rows match `where`: `continue` (default) finishes the action as a
     * no-op; `skip` ends the whole hook run as skipped.
     */
    ifNoMatches: z.enum(["continue", "skip"]).optional(),
  }),
  z.object({
    type: z.literal("deleteMatching"),
    entity: z.string().trim().min(1),
    where: dataHookUpdateMatchingWhereSchema,
  }),
  z.object({
    type: z.literal("deleteRecord"),
    entity: z.string().trim().min(1),
    id: expressionNodeSchema,
  }),
  z.object({
    type: z.literal("getRecord"),
    entity: z.string().trim().min(1),
    id: expressionNodeSchema,
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z
    .object({
      type: z.literal("getOrCreateRecord"),
      entity: z.string().trim().min(1),
      where: dataHookUpdateMatchingWhereSchema,
      /**
       * When true (default), create from `data` if no match. When false, load
       * `null` instead of creating (`data` may be omitted).
       */
      createIfMissing: z.boolean().optional(),
      data: expressionRecordSchema.optional(),
      as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
    })
    .superRefine((action, ctx) => {
      if (action.createIfMissing === false) {
        return;
      }
      if (action.data == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'getOrCreateRecord requires "data" when createIfMissing is true (default).',
          path: ["data"],
        });
      }
    }),
  z.object({
    type: z.literal("matchRelatedRecord"),
    entity: z.string().trim().min(1),
    where: dataHookUpdateMatchingWhereSchema,
    /** Text/subject/description expression scored against each candidate's alias field. */
    haystack: expressionNodeSchema,
    /** Field on related records: string or string[] of aliases. */
    aliasField: z.string().trim().min(1),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("aggregateMatching"),
    entity: z.string().trim().min(1),
    where: dataHookUpdateMatchingWhereSchema,
    op: z.enum(
      DATA_HOOK_AGGREGATE_OPERATORS as unknown as [
        DataHookAggregateOperator,
        ...DataHookAggregateOperator[],
      ],
    ),
    field: z.string().trim().min(1).optional(),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("sendNotification"),
    message: expressionNodeSchema,
    recordEntity: expressionNodeSchema.optional(),
    recordId: expressionNodeSchema.optional(),
  }),
  z.object({
    type: z.literal("callWebhook"),
    url: expressionNodeSchema,
    body: expressionNodeSchema.optional(),
  }),
  z.object({
    type: z.literal("callAi"),
    /**
     * User prompt expression (must evaluate to a non-empty string).
     * Include transaction context and instructions; category catalog may also
     * be injected via `includeEntities`.
     */
    prompt: expressionNodeSchema,
    /** Optional system instruction; defaults in the Vertex caller when omitted. */
    systemInstruction: expressionNodeSchema.optional(),
    /**
     * When set and evaluates to falsey, skip the model call and load `null`
     * at `as` (useful after a prior `matchRelatedRecord` hit).
     */
    when: expressionNodeSchema.optional(),
    /**
     * Load up to 500 records per entity into the model context. For
     * `category`, the worker emits a compact short-id catalog (optionally
     * pre-filtered via `retrievalHint`); other entities use compact JSON.
     */
    includeEntities: z
      .array(z.string().trim().min(1))
      .max(MAX_CALL_AI_INCLUDE_ENTITIES)
      .optional(),
    /**
     * Model tier. Omit or `flash` = default Flash model. `reasoning` = Pro /
     * reasoning model (long-form narrative JSON only).
     */
    model: z.enum(["flash", "reasoning"]).optional(),
    /**
     * Optional expression → string used to memoize/batch identical callAi
     * requests within a schedule tick (e.g. normalizeMatchText(description)).
     */
    cacheKey: expressionNodeSchema.optional(),
    /**
     * Optional expression → string used by the worker to pre-filter
     * `includeEntities` (category) catalogs (e.g. current.description).
     * No positive match → full catalog is sent.
     */
    retrievalHint: expressionNodeSchema.optional(),
    /** Alias for the parsed JSON object result (or `null` when skipped). */
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("computeEmbedding"),
    /** Text expression to embed. */
    text: expressionNodeSchema,
    /**
     * When set and evaluates to falsey, skip embedding and load `null` at `as`
     * (e.g. after a prior `matchSimilarRecord` hit).
     */
    when: expressionNodeSchema.optional(),
    /** Alias for `{ values: number[] }` (or `null` when text is empty). */
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("computeRecordAiSummary"),
    /** Optional entity-name expression; defaults to the hook's entity. */
    entityName: expressionNodeSchema.optional(),
    /** Skip summary computation when this expression is falsey. */
    when: expressionNodeSchema.optional(),
    /** Alias for `{ ok: true }` or null when skipped/unconfigured. */
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("upsertAiRecordContext"),
    /** Optional entity-name expression; defaults to the hook's entity. */
    entityName: expressionNodeSchema.optional(),
    /**
     * Optional record-id expression; defaults to `current.id`.
     * Use when writing an AI doc for a related record (e.g. parent financialItem).
     */
    recordId: expressionNodeSchema.optional(),
    /** Expression evaluating to a JSON object (or JSON string) snapshot. */
    context: expressionNodeSchema,
    /** Optional compact RAG text; defaults to JSON.stringify(context). */
    ragText: expressionNodeSchema.optional(),
    /** When true (default), enqueue narrative refresh if context hash changed. */
    enqueueNarrative: z.boolean().optional(),
    narrativeVariant: z.string().trim().min(1).optional(),
    /**
     * Optional role/objective prompt for the narrative job.
     * Processor always appends the AI-doc context snapshot as **Data:**.
     */
    narrativePrompt: expressionNodeSchema.optional(),
    /** Optional chart/markdown contract for the narrative job. */
    narrativeSystemInstruction: expressionNodeSchema.optional(),
    when: expressionNodeSchema.optional(),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("enqueueAiRecordNarrative"),
    entityName: expressionNodeSchema.optional(),
    /** Optional record-id expression; defaults to `current.id`. */
    recordId: expressionNodeSchema.optional(),
    variant: z.string().trim().min(1).optional(),
    prompt: expressionNodeSchema.optional(),
    systemInstruction: expressionNodeSchema.optional(),
    when: expressionNodeSchema.optional(),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("invalidateAiRecordNarratives"),
    /** Optional entity-name expression; defaults to the hook's entity. */
    entityName: expressionNodeSchema.optional(),
    /** Optional record-id expression; defaults to `current.id`. */
    recordId: expressionNodeSchema.optional(),
    /** Narrative variants to mark out of sync (e.g. loans + default). */
    variants: z.array(z.string().trim().min(1)).min(1),
    when: expressionNodeSchema.optional(),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
  }),
  z.object({
    type: z.literal("matchSimilarRecord"),
    entity: z.string().trim().min(1),
    where: dataHookUpdateMatchingWhereSchema,
    /** Text expression embedded and compared to candidates. */
    haystack: expressionNodeSchema,
    /** Field on candidates holding `number[]` embedding vectors. */
    embeddingField: z.string().trim().min(1),
    /**
     * Minimum cosine similarity (0..1). Defaults to
     * {@link DEFAULT_MATCH_SIMILAR_MIN_SCORE}.
     */
    minScore: z.number().min(0).max(1).optional(),
    /**
     * When set and evaluates to falsey, skip similarity search and load `null`
     * at `as` (e.g. after a prior transaction match).
     */
    when: expressionNodeSchema.optional(),
    as: z.string().trim().regex(DATA_HOOK_LOADED_ALIAS_PATTERN),
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
type DataHookDefinitionParsed = z.infer<typeof dataHookDefinitionSchema>;
export type DataHookDefinition = Omit<DataHookDefinitionParsed, "trigger"> & {
  trigger: DataHookTrigger;
};

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
type CreateDataHookInputParsed = z.infer<typeof createDataHookInputSchema>;
export type CreateDataHookInput = Omit<CreateDataHookInputParsed, "trigger"> & {
  trigger: DataHookTrigger;
};

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
type PatchDataHookInputParsed = z.infer<typeof patchDataHookInputSchema>;
export type PatchDataHookInput = Omit<PatchDataHookInputParsed, "trigger"> & {
  trigger?: DataHookTrigger;
};

/** Collect entity names referenced by an action's target (for validation). */
export function actionTargetEntities(
  action: DataHookAction,
): readonly string[] {
  switch (action.type) {
    case "createRecord":
    case "createRecords":
    case "updateMatching":
    case "deleteMatching":
    case "deleteRecord":
    case "getRecord":
    case "getOrCreateRecord":
    case "matchRelatedRecord":
    case "matchSimilarRecord":
    case "aggregateMatching":
      return [action.entity];
    case "setField":
    case "sendNotification":
    case "callWebhook":
    case "computeEmbedding":
    case "computeRecordAiSummary":
    case "upsertAiRecordContext":
    case "enqueueAiRecordNarrative":
    case "invalidateAiRecordNarratives":
      return [];
    case "callAi":
      return action.includeEntities ?? [];
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
