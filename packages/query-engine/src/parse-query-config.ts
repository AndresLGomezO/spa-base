import {
  SYSTEM_FIELD_KEYS,
  usesForeignKeyStorage,
  resolveSearchStorageField,
  type DefinedEntity,
  type FieldDefinitions,
  type NormalizedFieldMeta,
  type Phase1FieldType,
} from "@repo/entities";
import {
  isPostFilterOperator,
  type FilterOperator,
  type NormalizedEntityQuery,
  type NormalizedFilter,
  type NormalizedSort,
} from "@repo/firestore-converters";
import { z } from "zod";

import { QueryError, QueryErrorCode } from "./errors.js";
import { SEARCH_SOURCE_FIELDS_FILTER_FIELD } from "./post-filters.js";
import type { Filter, ListQueryInput, QueryConfig, Sort } from "./types.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const filterOperatorSchema = z.enum([
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "in",
  "array-contains",
  "contains",
  "startsWith",
  "endsWith",
]);

const filterSchema = z
  .object({
    field: z.string().trim().min(1),
    operator: filterOperatorSchema,
    value: z.unknown(),
  })
  .strict();

const sortSchema = z
  .object({
    field: z.string().trim().min(1),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();

const queryConfigSchema = z
  .object({
    filter: z.array(filterSchema).optional(),
    sort: z.array(sortSchema).max(1).optional(),
    search: z.string().trim().optional(),
    pagination: z
      .object({
        limit: z.number().int().positive().max(MAX_LIMIT),
        cursor: z.string().trim().min(1).optional(),
        offset: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
    select: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

const NON_QUERYABLE_SYSTEM_FIELDS = new Set([
  "tenantId",
  "updatedAt",
  "sharedWith",
]);

const QUERYABLE_SYSTEM_FIELDS = new Set<string>(
  SYSTEM_FIELD_KEYS.filter((key) => !NON_QUERYABLE_SYSTEM_FIELDS.has(key)),
);

const INEQUALITY_OPERATORS = new Set<FilterOperator>([
  "!=",
  ">",
  "<",
  ">=",
  "<=",
]);

const OPERATORS_BY_FIELD_TYPE: Record<
  Phase1FieldType,
  readonly FilterOperator[] | null
> = {
  string: ["==", "!=", "in", "contains", "startsWith", "endsWith"],
  number: ["==", "!=", "<", "<=", ">", ">=", "in"],
  boolean: ["=="],
  date: ["==", "!=", "<", "<=", ">", ">="],
  relation: ["==", "in"],
  enum: ["==", "!=", "in"],
  image: null,
  document: null,
};

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

function listSensitiveFieldNames(entity: AnyDefinedEntity): readonly string[] {
  return Object.keys(entity.metadata.fields).filter(
    (fieldName) => entity.metadata.fields[fieldName]?.sensitive === true,
  );
}

const fieldOperatorCache = new WeakMap<
  AnyDefinedEntity,
  Map<string, readonly FilterOperator[] | null>
>();

function isEntityArrayField(
  entity: AnyDefinedEntity,
  fieldName: string,
): boolean {
  if (SYSTEM_ARRAY_FIELDS.has(fieldName)) {
    return true;
  }

  return entity.metadata.fields[fieldName]?.isArray === true;
}

function getAllowedOperators(
  entity: AnyDefinedEntity,
  fieldName: string,
): readonly FilterOperator[] | null {
  let entityCache = fieldOperatorCache.get(entity);
  if (!entityCache) {
    entityCache = new Map();
    fieldOperatorCache.set(entity, entityCache);
  }

  if (entityCache.has(fieldName)) {
    return entityCache.get(fieldName) ?? null;
  }

  if (isEntityArrayField(entity, fieldName)) {
    entityCache.set(fieldName, ["array-contains"]);
    return ["array-contains"];
  }

  const fieldType = resolveFieldType(entity, fieldName);
  const allowed = fieldType ? OPERATORS_BY_FIELD_TYPE[fieldType] : null;
  entityCache.set(fieldName, allowed);
  return allowed;
}

export interface ParseListQueryOptions {
  readonly strictPagination?: boolean;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_LIMIT;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function getFieldMeta(
  entity: AnyDefinedEntity,
  fieldName: string,
): NormalizedFieldMeta | null {
  if (QUERYABLE_SYSTEM_FIELDS.has(fieldName)) {
    if (fieldName === "id" || fieldName === "ownerId") {
      return { type: "string", required: true, optional: false };
    }
    if (fieldName === "createdAt") {
      return { type: "date", required: true, optional: false };
    }
    if (fieldName === "accessUserIds") {
      return { type: "string", required: false, optional: true };
    }
    return null;
  }

  const meta = entity.metadata.fields[fieldName];
  return meta ?? null;
}

function resolveFieldType(
  entity: AnyDefinedEntity,
  fieldName: string,
): Phase1FieldType | null {
  const meta = getFieldMeta(entity, fieldName);
  if (!meta) {
    return null;
  }

  if (meta.type === "relation") {
    if (!meta.relation || !usesForeignKeyStorage(meta.relation)) {
      return null;
    }
    return "relation";
  }

  if (meta.type === "image" || meta.type === "document") {
    return null;
  }

  return meta.type;
}

function validateFilterValue(operator: FilterOperator, value: unknown): void {
  if (operator === "in") {
    if (!Array.isArray(value) || value.length === 0) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        'Operator "in" requires a non-empty array value.',
      );
    }
    return;
  }

  if (operator === "array-contains") {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        'Operator "array-contains" requires a scalar value.',
      );
    }
  }

  if (isPostFilterOperator(operator)) {
    if (typeof value !== "string") {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `Operator "${operator}" requires a string value.`,
      );
    }
  }
}

const SYSTEM_ARRAY_FIELDS = new Set(["accessUserIds"]);

function validateFilter(
  entity: AnyDefinedEntity,
  filter: Filter,
): NormalizedFilter {
  if (filter.field === "tenantId") {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      'Filtering on "tenantId" is not allowed.',
    );
  }

  const fieldMeta = getFieldMeta(entity, filter.field);
  if (fieldMeta?.sensitive) {
    throw new QueryError(
      QueryErrorCode.QUERY_ON_ENCRYPTED_FIELD,
      `Filtering on encrypted fields is not supported.`,
    );
  }

  if (isEntityArrayField(entity, filter.field)) {
    if (filter.operator !== "array-contains") {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `Only "array-contains" is allowed for field "${filter.field}".`,
      );
    }
    validateFilterValue(filter.operator, filter.value);
    return {
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
    };
  }

  const fieldType = resolveFieldType(entity, filter.field);
  if (!fieldType) {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      `Unknown or non-queryable field "${filter.field}".`,
    );
  }

  const allowedOperators = getAllowedOperators(entity, filter.field);
  if (!allowedOperators || !allowedOperators.includes(filter.operator)) {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      `Operator "${filter.operator}" is not allowed for field "${filter.field}".`,
    );
  }

  validateFilterValue(filter.operator, filter.value);

  return {
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
  };
}

function validateSort(entity: AnyDefinedEntity, sort: Sort): NormalizedSort {
  if (sort.field === "tenantId") {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      'Sorting on "tenantId" is not allowed.',
    );
  }

  const sortFieldMeta = getFieldMeta(entity, sort.field);
  if (sortFieldMeta?.sensitive) {
    throw new QueryError(
      QueryErrorCode.QUERY_ON_ENCRYPTED_FIELD,
      `Sorting on encrypted fields is not supported.`,
    );
  }

  if (resolveFieldType(entity, sort.field) === null) {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      `Unknown or non-queryable sort field "${sort.field}".`,
    );
  }

  if (isEntityArrayField(entity, sort.field)) {
    throw new QueryError(
      QueryErrorCode.QUERY_VALIDATION_ERROR,
      `Sorting on array field "${sort.field}" is not supported.`,
    );
  }

  return {
    field: sort.field,
    direction: sort.direction,
  };
}

function validateSelect(
  entity: AnyDefinedEntity,
  select: readonly string[],
): readonly string[] {
  for (const fieldName of select) {
    if (fieldName === "tenantId") {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        'Selecting "tenantId" is not allowed.',
      );
    }

    if (resolveFieldType(entity, fieldName) === null) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `Unknown or non-queryable select field "${fieldName}".`,
      );
    }
  }

  return select;
}

function enforceFirestoreConstraints(
  filters: readonly NormalizedFilter[],
  sort: NormalizedSort | null,
): NormalizedSort {
  const inequalityFilters = filters.filter((filter) =>
    INEQUALITY_OPERATORS.has(filter.operator),
  );

  const inequalityFields = new Set(inequalityFilters.map((f) => f.field));
  if (inequalityFields.size > 1) {
    throw new QueryError(
      QueryErrorCode.QUERY_UNSUPPORTED,
      "Inequality filters on multiple fields are not supported. All range filters must target the same field.",
    );
  }

  const inequalityFilter = inequalityFilters[0];
  if (!inequalityFilter) {
    return sort ?? { field: "id", direction: "asc" };
  }

  const primarySort = sort ?? {
    field: inequalityFilter.field,
    direction: "asc" as const,
  };

  if (primarySort.field !== inequalityFilter.field) {
    throw new QueryError(
      QueryErrorCode.QUERY_UNSUPPORTED,
      "When using an inequality filter, the primary sort field must match the filtered field.",
    );
  }

  return primarySort;
}

export { resolveSearchField } from "@repo/entities";

export function parseListQueryInput(
  input: ListQueryInput,
  options: ParseListQueryOptions = {},
): QueryConfig {
  if (options.strictPagination) {
    if (input.limit !== undefined && input.limit > MAX_LIMIT) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        `Limit cannot exceed ${MAX_LIMIT}.`,
      );
    }
    if (!input.query && input.limit === undefined) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        "List requests must include an explicit limit or query pagination.",
      );
    }
  }

  let config: QueryConfig = {};

  if (input.query) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(input.query);
    } catch {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        "Query parameter must be valid JSON.",
      );
    }

    const parsedConfig = queryConfigSchema.safeParse(parsedJson);
    if (!parsedConfig.success) {
      throw new QueryError(
        QueryErrorCode.QUERY_VALIDATION_ERROR,
        "Invalid query configuration.",
      );
    }

    config = parsedConfig.data;
  }

  const limit = normalizeLimit(config.pagination?.limit ?? input.limit);
  const cursor = config.pagination?.cursor ?? input.cursor;
  const offset = config.pagination?.offset;
  const search = config.search ?? input.search;

  return {
    ...config,
    ...(search ? { search } : {}),
    pagination: {
      limit,
      ...(cursor ? { cursor } : {}),
      ...(offset !== undefined ? { offset } : {}),
    },
  };
}

export function normalizeEntityQuery(
  entity: AnyDefinedEntity,
  config: QueryConfig,
): NormalizedEntityQuery {
  const allFilters = (config.filter ?? []).map((filter) =>
    validateFilter(entity, filter),
  );

  const firestoreFilters = allFilters.filter(
    (f) => !isPostFilterOperator(f.operator),
  );
  const userPostFilters = allFilters.filter((f) =>
    isPostFilterOperator(f.operator),
  );

  let searchField: string | undefined;
  let search: string | undefined;
  const searchPostFilters: NormalizedFilter[] = [];

  if (config.search && config.search.length > 0) {
    const lowerTerm = config.search.toLowerCase();
    search = config.search;

    if (entity.metadata.inMemoryListQueries === true) {
      searchField = SEARCH_SOURCE_FIELDS_FILTER_FIELD;
      searchPostFilters.push({
        field: SEARCH_SOURCE_FIELDS_FILTER_FIELD,
        operator: "sourceFieldsContain",
        value: {
          term: lowerTerm,
          excludeFields: listSensitiveFieldNames(entity),
        },
      });
    } else {
      const field = resolveSearchStorageField(entity);
      if (!field) {
        throw new QueryError(
          QueryErrorCode.SEARCH_NOT_CONFIGURED,
          `Search is not available for entity "${entity.name}". No searchable string field found.`,
        );
      }
      searchField = field;
      searchPostFilters.push({
        field,
        operator: "tokenStartsWith",
        value: lowerTerm,
      });
    }
  }

  const nativeFilters = firestoreFilters;
  const postFilters = [...userPostFilters, ...searchPostFilters];

  const sortEntry = config.sort?.[0] ?? null;
  const sort = sortEntry ? validateSort(entity, sortEntry) : null;

  const primarySort = enforceFirestoreConstraints(nativeFilters, sort);
  const select = config.select
    ? validateSelect(entity, config.select)
    : undefined;

  const offset = config.pagination?.offset;
  const useOffset = offset !== undefined;

  return {
    filters: nativeFilters,
    postFilters,
    sort: primarySort,
    limit: normalizeLimit(config.pagination?.limit),
    ...(useOffset
      ? { offset }
      : config.pagination?.cursor
        ? { cursor: config.pagination.cursor }
        : {}),
    ...(select ? { select } : {}),
    ...(search ? { search, searchField } : {}),
  };
}
