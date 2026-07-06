import {
  createEmptyAndGroup,
  MAX_FILTER_TREE_DEPTH,
  MAX_OR_DISJUNCTIONS,
  type FilterGroup,
  type FilterNode,
} from "./filter-tree.js";
import { z } from "zod";

export {
  ENTITY_QUERY_DEFINITION_PERMISSIONS,
  ENTITY_QUERY_PERMISSIONS,
} from "./permissions.js";

export const ENTITY_QUERY_DEFINITIONS_COLLECTION =
  "__entity_query_definitions" as const;

export const ENTITY_QUERY_DEFINITION_STATUSES = ["ACTIVE", "PAUSED"] as const;
export type EntityQueryDefinitionStatus =
  (typeof ENTITY_QUERY_DEFINITION_STATUSES)[number];

export const ENTITY_QUERY_LIMIT_MODES = ["topN", "all"] as const;
export type EntityQueryLimitMode = (typeof ENTITY_QUERY_LIMIT_MODES)[number];

/** Firestore-native operators supported in entity query definitions. */
export const ENTITY_QUERY_FILTER_OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
] as const;

export type EntityQueryFilterOperator =
  (typeof ENTITY_QUERY_FILTER_OPERATORS)[number];

export const ENTITY_QUERY_TEMPORAL_PRESETS = [
  "today",
  "startOfDay",
  "endOfDay",
  "startOfWeek",
  "endOfWeek",
  "startOfMonth",
  "endOfMonth",
  "startOfYear",
  "endOfYear",
] as const;

export type EntityQueryTemporalPreset =
  (typeof ENTITY_QUERY_TEMPORAL_PRESETS)[number];

export const ENTITY_QUERY_PARAMETER_VALUE_TYPES = [
  "dateBucket",
  "scalar",
  "stringList",
] as const;

export type EntityQueryParameterValueType =
  (typeof ENTITY_QUERY_PARAMETER_VALUE_TYPES)[number];

export const ENTITY_QUERY_PARAMETER_BOUNDS = ["start", "end", "value"] as const;

export type EntityQueryParameterBound =
  (typeof ENTITY_QUERY_PARAMETER_BOUNDS)[number];

export const entityQueryParameterSchema = z
  .object({
    name: z.string().trim().min(1),
    valueType: z.enum(ENTITY_QUERY_PARAMETER_VALUE_TYPES),
    granularity: z.enum(["day", "month", "year"]).optional(),
    field: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.valueType === "dateBucket" && !value.field) {
      context.addIssue({
        code: "custom",
        message: "dateBucket parameters require a field.",
        path: ["field"],
      });
    }
  });

export type EntityQueryParameter = z.infer<typeof entityQueryParameterSchema>;

export const entityQueryFilterValueSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("static"),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()])),
      ]),
    })
    .strict(),
  z
    .object({
      type: z.literal("temporal"),
      preset: z.enum(ENTITY_QUERY_TEMPORAL_PRESETS),
    })
    .strict(),
  z
    .object({
      type: z.literal("parameter"),
      name: z.string().trim().min(1),
      bound: z.enum(ENTITY_QUERY_PARAMETER_BOUNDS).optional(),
      offset: z.number().int().optional(),
      unit: z.enum(["day", "month", "year"]).optional(),
    })
    .strict()
    .superRefine((value, context) => {
      if (value.offset !== undefined && value.unit === undefined) {
        context.addIssue({
          code: "custom",
          message: "Parameter offset requires a unit.",
          path: ["unit"],
        });
      }
      if (value.unit !== undefined && value.offset === undefined) {
        context.addIssue({
          code: "custom",
          message: "Parameter unit requires an offset.",
          path: ["offset"],
        });
      }
    }),
]);

export type EntityQueryFilterValue = z.infer<
  typeof entityQueryFilterValueSchema
>;

export const entityQueryFilterSchema = z.object({
  field: z.string().trim().min(1),
  operator: z.enum(ENTITY_QUERY_FILTER_OPERATORS),
  value: entityQueryFilterValueSchema,
});

export type EntityQueryFilter = z.infer<typeof entityQueryFilterSchema>;

export const entityQueryFilterConditionSchema = z
  .object({
    type: z.literal("condition"),
    field: z.string().trim().min(1),
    operator: z.enum(ENTITY_QUERY_FILTER_OPERATORS),
    value: entityQueryFilterValueSchema,
  })
  .strict();

export type EntityQueryFilterCondition = z.infer<
  typeof entityQueryFilterConditionSchema
>;

export type EntityQueryFilterNode =
  | EntityQueryFilterCondition
  | {
      readonly type: "group";
      readonly combinator: "and" | "or";
      readonly children: readonly EntityQueryFilterNode[];
    };

export type EntityQueryDefinitionFilterRoot = {
  readonly type: "group";
  readonly combinator: "and" | "or";
  readonly children: readonly EntityQueryFilterNode[];
};

export const entityQueryFilterGroupSchema = z.object({
  type: z.literal("group"),
  combinator: z.enum(["and", "or"]),
  children: z.array(z.lazy(() => entityQueryFilterNodeSchema)),
});

export const entityQueryFilterNodeSchema: z.ZodType<EntityQueryFilterNode> =
  z.lazy(() =>
    z.discriminatedUnion("type", [
      entityQueryFilterConditionSchema,
      entityQueryFilterGroupSchema,
    ]),
  );

export const entityQuerySortSchema = z.object({
  field: z.string().trim().min(1),
  direction: z.enum(["asc", "desc"]),
});

export type EntityQuerySort = z.infer<typeof entityQuerySortSchema>;

export const EMPTY_ENTITY_QUERY_FILTER: FilterGroup = createEmptyAndGroup();

function countOrGroups(node: FilterNode): number {
  if (node.type === "condition") {
    return 0;
  }
  let count = node.combinator === "or" ? 1 : 0;
  for (const child of node.children) {
    count += countOrGroups(child);
  }
  return count;
}

export function refineEntityQueryFilterTree(
  filter: FilterNode,
  context: z.RefinementCtx,
  pathPrefix: string[] = ["filter"],
  depth = 1,
  isRoot = true,
): void {
  if (depth > MAX_FILTER_TREE_DEPTH) {
    context.addIssue({
      code: "custom",
      message: `Filter tree exceeds maximum depth of ${MAX_FILTER_TREE_DEPTH}.`,
      path: pathPrefix,
    });
    return;
  }

  if (filter.type === "condition") {
    const conditionValue = filter.value as EntityQueryFilterValue;
    if (filter.operator === "in") {
      if (conditionValue.type === "static") {
        if (
          !Array.isArray(conditionValue.value) ||
          conditionValue.value.length === 0
        ) {
          context.addIssue({
            code: "custom",
            message: "in operator requires a non-empty static array value.",
            path: pathPrefix,
          });
        }
      } else if (conditionValue.type !== "parameter") {
        context.addIssue({
          code: "custom",
          message: "in operator requires a static array or parameter value.",
          path: pathPrefix,
        });
      }
    } else if (
      conditionValue.type === "static" &&
      Array.isArray(conditionValue.value)
    ) {
      context.addIssue({
        code: "custom",
        message: "Array values are only supported with the in operator.",
        path: pathPrefix,
      });
    }
    return;
  }

  if (!isRoot && filter.children.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Filter groups must contain at least one child.",
      path: pathPrefix,
    });
  }

  const orCount = countOrGroups(filter);
  if (orCount > MAX_OR_DISJUNCTIONS) {
    context.addIssue({
      code: "custom",
      message: `Filter tree exceeds maximum of ${MAX_OR_DISJUNCTIONS} OR groups.`,
      path: pathPrefix,
    });
  }

  for (let index = 0; index < filter.children.length; index += 1) {
    refineEntityQueryFilterTree(
      filter.children[index]!,
      context,
      [...pathPrefix, "children", String(index)],
      depth + 1,
      false,
    );
  }
}

export function migrateLegacyFiltersToFilterTree(record: {
  readonly filters?: readonly EntityQueryFilter[];
  readonly filter?: FilterNode;
}): FilterGroup {
  if (record.filter) {
    return record.filter as FilterGroup;
  }

  if (record.filters && record.filters.length > 0) {
    return {
      type: "group",
      combinator: "and",
      children: record.filters.map((filter) => ({
        type: "condition" as const,
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
      })),
    };
  }

  return createEmptyAndGroup();
}

export function migrateEntityQueryDefinitionRecord<
  T extends {
    readonly filters?: readonly EntityQueryFilter[];
    readonly filter?: FilterNode;
  },
>(record: T): Omit<T, "filters"> & { readonly filter: FilterGroup } {
  const filter = migrateLegacyFiltersToFilterTree(record);
  const rest = { ...record };
  delete (rest as { filters?: readonly EntityQueryFilter[] }).filters;
  return {
    ...rest,
    filter,
  };
}

function refineQueryParameterFilterTree(
  filter: EntityQueryFilterNode,
  parameters: readonly EntityQueryParameter[],
  context: z.RefinementCtx,
  pathPrefix: string[] = ["filter"],
): void {
  if (filter.type === "condition") {
    const conditionValue = filter.value;
    if (conditionValue.type === "parameter") {
      const parameter = parameters.find(
        (entry) => entry.name === conditionValue.name,
      );
      if (!parameter) {
        context.addIssue({
          code: "custom",
          message: `Unknown query parameter "${conditionValue.name}".`,
          path: pathPrefix,
        });
        return;
      }
      if (
        conditionValue.bound &&
        conditionValue.bound !== "value" &&
        parameter.valueType !== "dateBucket"
      ) {
        context.addIssue({
          code: "custom",
          message: `Parameter bound "${conditionValue.bound}" requires a dateBucket parameter.`,
          path: pathPrefix,
        });
      }
      if (
        (conditionValue.offset !== undefined ||
          conditionValue.unit !== undefined) &&
        parameter.valueType !== "dateBucket"
      ) {
        context.addIssue({
          code: "custom",
          message: "Parameter offset requires a dateBucket parameter.",
          path: pathPrefix,
        });
      }
      if (filter.operator === "in" && parameter.valueType !== "stringList") {
        context.addIssue({
          code: "custom",
          message: `Parameter "${conditionValue.name}" used with in operator must be stringList.`,
          path: pathPrefix,
        });
      }
      if (parameter.valueType === "stringList" && filter.operator !== "in") {
        context.addIssue({
          code: "custom",
          message: `stringList parameter "${conditionValue.name}" requires the in operator.`,
          path: pathPrefix,
        });
      }
    }
    return;
  }

  for (let index = 0; index < filter.children.length; index += 1) {
    refineQueryParameterFilterTree(
      filter.children[index]!,
      parameters,
      context,
      [...pathPrefix, "children", String(index)],
    );
  }
}

const entityQueryDefinitionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  sourceEntity: z.string().trim().min(1),
  parameters: z.array(entityQueryParameterSchema).default([]),
  filter: entityQueryFilterGroupSchema.optional().default({
    type: "group",
    combinator: "and",
    children: [],
  }),
  sort: z.array(entityQuerySortSchema).default([]),
  select: z.array(z.string().trim().min(1)).optional(),
  limitMode: z.enum(ENTITY_QUERY_LIMIT_MODES).default("topN"),
  limit: z.number().int().positive().max(100).optional(),
  status: z.enum(ENTITY_QUERY_DEFINITION_STATUSES).default("ACTIVE"),
});

function refineEntityQueryDefinitionBody(
  value: {
    readonly limitMode: EntityQueryLimitMode;
    readonly limit?: number;
    readonly filter: EntityQueryFilterNode;
    readonly parameters: readonly EntityQueryParameter[];
  },
  context: z.RefinementCtx,
): void {
  if (value.limitMode === "topN" && value.limit === undefined) {
    context.addIssue({
      code: "custom",
      message: "limit is required when limitMode is topN.",
      path: ["limit"],
    });
  }

  refineEntityQueryFilterTree(value.filter, context);
  refineQueryParameterFilterTree(value.filter, value.parameters, context);
}

const legacyEntityQueryDefinitionRecordSchema = entityQueryDefinitionBodySchema
  .extend({
    id: z.string().trim().min(1),
    tenantId: z.string().trim().min(1),
    queryId: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
    filters: z.array(entityQueryFilterSchema).optional(),
  })
  .superRefine((value, context) => {
    refineEntityQueryDefinitionBody(
      {
        limitMode: value.limitMode,
        limit: value.limit,
        filter: value.filter,
        parameters: value.parameters ?? [],
      },
      context,
    );
  });

export const entityQueryDefinitionRecordSchema =
  legacyEntityQueryDefinitionRecordSchema.transform((record) =>
    migrateEntityQueryDefinitionRecord(record),
  );

export type EntityQueryDefinitionRecord = Omit<
  z.infer<typeof legacyEntityQueryDefinitionRecordSchema>,
  "filter"
> & {
  readonly filter: EntityQueryDefinitionFilterRoot;
};

export const createEntityQueryDefinitionInputSchema =
  entityQueryDefinitionBodySchema
    .extend({
      limit: z.number().int().positive().max(100).default(20),
      status: z.enum(ENTITY_QUERY_DEFINITION_STATUSES).default("ACTIVE"),
    })
    .superRefine(refineEntityQueryDefinitionBody);

export type CreateEntityQueryDefinitionInput = z.infer<
  typeof createEntityQueryDefinitionInputSchema
>;

export const patchEntityQueryDefinitionInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    parameters: z.array(entityQueryParameterSchema).optional(),
    filter: entityQueryFilterGroupSchema.optional(),
    sort: z.array(entityQuerySortSchema).optional(),
    select: z.array(z.string().trim().min(1)).optional(),
    limitMode: z.enum(ENTITY_QUERY_LIMIT_MODES).optional(),
    limit: z.number().int().positive().max(100).optional(),
    status: z.enum(ENTITY_QUERY_DEFINITION_STATUSES).optional(),
  })
  .strict();

export type PatchEntityQueryDefinitionInput = z.infer<
  typeof patchEntityQueryDefinitionInputSchema
>;
