import type {
  CreateUiBuilderPresetInput,
  EntityRecordsExportEnvelope,
  EntityUIConfig,
  EntityUiOverrideRecord,
  PutTenantDashboardLayoutInput,
  PutTenantSidebarLayoutInput,
  PutEntityUiOverrideInput,
  SerializableEntityDefinition,
  TenantDashboardLayoutRecord,
  TenantSidebarLayoutRecord,
  UiBuilderPresetRecord,
  UpdateUiBuilderPresetInput,
} from "@repo/entities";
import type { QueryConfig } from "@repo/query-engine";
import type { MetricDefinitionsCatalogEnvelope } from "@repo/metrics-engine/browser";
import type { EntityQueryDefinitionsCatalogEnvelope } from "@repo/entity-queries/browser";
import type { CustomViewsCatalogEnvelope } from "@repo/custom-views/browser";

import { appConfig } from "../config/app-config";
import { getAppCheckHeaderValue } from "./app-check";
import { fetchWithRateLimitRetry } from "./fetch-rate-limit-retry";
import { auth } from "./firebase";

interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

interface ApiEnvelope<T> {
  readonly data: T | null;
  readonly error: ApiErrorBody | null;
}

export interface ApiClientError extends Error {
  statusCode: number;
  code: string;
  fieldErrors: Record<string, string>;
  details?: unknown;
}

export type IndexProvisioningPhase = "idle" | "building" | "ready" | "error";

export type IndexProvisioningJobPhase =
  | "pending"
  | "creating"
  | "ready"
  | "error";

export type IndexProvisioningLogLevel =
  | "info"
  | "success"
  | "warning"
  | "error";

export interface IndexProvisioningLogEntry {
  readonly timestamp: string;
  readonly level: IndexProvisioningLogLevel;
  readonly event: string;
  readonly message: string;
  readonly detail?: string;
}

export interface IndexProvisioningJob {
  readonly signature: string;
  readonly collection: string;
  readonly phase: IndexProvisioningJobPhase;
  readonly requiresManualAction: boolean;
  readonly errorMessage?: string;
  readonly fields?: readonly Record<string, unknown>[];
  readonly log: readonly IndexProvisioningLogEntry[];
}

export interface IndexStatusRecord {
  readonly signature: string;
  readonly collection: string;
  readonly status: "CREATING" | "READY" | "ERROR";
  readonly errorMessage?: string;
  readonly updatedAt: string;
}

export interface IndexProvisioningStatusSummary {
  readonly collection: string;
  readonly phase: IndexProvisioningPhase;
  readonly records: readonly IndexStatusRecord[];
  readonly creatingCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
}

interface TenantIndexProvisioningStatus {
  readonly phase: IndexProvisioningPhase;
  readonly isEnvironmentReady: boolean;
  readonly collections: readonly IndexProvisioningStatusSummary[];
  readonly buildingCollections: readonly string[];
  readonly errorCollections: readonly string[];
  readonly totalIndexes: number;
  readonly creatingCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
  readonly requiresManualActionCount: number;
  readonly indexes: readonly IndexProvisioningJob[];
}

const INDEX_LIST_ERROR_CODES = new Set([
  "INDEX_CREATING",
  "COMPOSITE_INDEX_REQUIRED",
  "INDEX_PROVISIONING_FAILED",
]);

export function isIndexListErrorCode(code: string): boolean {
  return INDEX_LIST_ERROR_CODES.has(code);
}

export function isTransientIndexListError(code: string): boolean {
  return code === "INDEX_CREATING" || code === "COMPOSITE_INDEX_REQUIRED";
}

export function isHardIndexListError(code: string): boolean {
  return code === "INDEX_PROVISIONING_FAILED";
}

interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly totalCount: number;
}

interface RequestOptions {
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly body?: unknown;
  readonly query?: Record<string, string | number | undefined>;
}

export function mapFieldErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") {
    return {};
  }

  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    if (Array.isArray(messages) && messages.length > 0) {
      const first = messages[0];
      if (typeof first === "string") {
        fieldErrors[field] = first;
      }
    } else if (typeof messages === "string") {
      fieldErrors[field] = messages;
    }
  }
  return fieldErrors;
}

function createApiClientError(
  statusCode: number,
  error: ApiErrorBody,
): ApiClientError {
  const clientError = new Error(error.message) as ApiClientError;
  clientError.name = "ApiClientError";
  clientError.statusCode = statusCode;
  clientError.code = error.code;
  clientError.fieldErrors = mapFieldErrors(error.details);
  if (error.details !== undefined) {
    clientError.details = error.details;
  }
  return clientError;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication is required.");
  }

  const [idToken, appCheckToken] = await Promise.all([
    currentUser.getIdToken(),
    getAppCheckHeaderValue(),
  ]);

  return {
    Authorization: `Bearer ${idToken}`,
    "X-Firebase-AppCheck": appCheckToken,
  };
}

function buildUrl(path: string, query?: RequestOptions["query"]): URL {
  const url = new URL(path, appConfig.apiBaseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  const url = buildUrl(path, options.query);

  const response = await fetchWithRateLimitRetry(url, {
    method: options.method ?? "GET",
    headers: {
      ...headers,
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error) {
    throw createApiClientError(
      response.status,
      payload.error ?? {
        code: "REQUEST_FAILED",
        message: "Request failed.",
      },
    );
  }

  if (payload.data === null) {
    throw createApiClientError(response.status, {
      code: "EMPTY_RESPONSE",
      message: "Response did not include data.",
    });
  }

  return payload.data;
}

export async function listEntities(): Promise<{
  readonly items: readonly SerializableEntityDefinition[];
}> {
  return apiRequest<{
    readonly items: readonly SerializableEntityDefinition[];
  }>("/api/entities");
}

export async function getAccessibleEntityDefinition(
  entityName: string,
): Promise<SerializableEntityDefinition> {
  const result = await apiRequest<{
    readonly definition: SerializableEntityDefinition;
  }>(`/api/entities/${encodeURIComponent(entityName)}/definition`);
  return result.definition;
}

export async function listEntity<T>(
  entityName: string,
  options: {
    readonly limit?: number;
    readonly cursor?: string;
    readonly query?: QueryConfig;
    readonly search?: string;
    readonly populate?: string;
  } = {},
): Promise<PaginatedResult<T>> {
  const query =
    options.query && Object.keys(options.query).length > 0
      ? JSON.stringify(options.query)
      : undefined;

  return apiRequest<PaginatedResult<T>>(`/api/${entityName}`, {
    query: {
      limit: options.limit,
      cursor: options.cursor,
      query,
      search: options.search,
      populate: options.populate,
    },
  });
}

export interface CatalogSearchItem {
  readonly entityName: string;
  readonly entityLabel: string;
  readonly id: string;
  readonly label: string;
  readonly record: Record<string, unknown>;
}

export async function searchCatalog(options: {
  readonly q: string;
  readonly limit?: number;
}): Promise<{ readonly items: readonly CatalogSearchItem[] }> {
  return apiRequest<{ readonly items: readonly CatalogSearchItem[] }>(
    "/api/search",
    {
      query: {
        q: options.q,
        limit: options.limit,
      },
    },
  );
}

export async function getEntity<T>(
  entityName: string,
  id: string,
  options?: { readonly populate?: string },
): Promise<T> {
  return apiRequest<T>(`/api/${entityName}/${id}`, {
    query: options?.populate ? { populate: options.populate } : undefined,
  });
}

export async function createEntity<T>(
  entityName: string,
  body: Record<string, unknown>,
): Promise<T> {
  return apiRequest<T>(`/api/${entityName}`, {
    method: "POST",
    body,
  });
}

export async function updateEntity<T>(
  entityName: string,
  id: string,
  body: Record<string, unknown>,
): Promise<T> {
  return apiRequest<T>(`/api/${entityName}/${id}`, {
    method: "PUT",
    body,
  });
}

export async function deleteEntity(
  entityName: string,
  id: string,
): Promise<{ readonly deleted: boolean }> {
  return apiRequest<{ readonly deleted: boolean }>(`/api/${entityName}/${id}`, {
    method: "DELETE",
  });
}

interface EntityRecordsImportResult {
  readonly created: number;
  readonly updated: number;
  readonly items: readonly {
    readonly id: string;
    readonly operation: "created" | "updated";
  }[];
}

export async function fetchEntityRecordsJsonExport(
  entityName: string,
  options?: { readonly tenantId?: string },
): Promise<EntityRecordsExportEnvelope> {
  return apiRequest<EntityRecordsExportEnvelope>(
    `/api/${encodeURIComponent(entityName)}/export-json`,
    {
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

export async function submitEntityRecordsJsonImport(
  entityName: string,
  body: unknown,
  options?: { readonly tenantId?: string },
): Promise<EntityRecordsImportResult> {
  return apiRequest<EntityRecordsImportResult>(
    `/api/${encodeURIComponent(entityName)}/import-json`,
    {
      method: "POST",
      body,
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

export async function getEntityRelationTargets(
  entityName: string,
  recordId: string,
  fieldName: string,
): Promise<readonly string[]> {
  const result = await apiRequest<{ readonly targetIds: readonly string[] }>(
    `/api/${entityName}/${recordId}/relations/${fieldName}`,
  );
  return result.targetIds;
}

export async function syncEntityRelationTargets(
  entityName: string,
  recordId: string,
  fieldName: string,
  targetIds: readonly string[],
): Promise<readonly string[]> {
  const result = await apiRequest<{ readonly targetIds: readonly string[] }>(
    `/api/${entityName}/${recordId}/relations/${fieldName}`,
    {
      method: "PUT",
      body: { targetIds },
    },
  );
  return result.targetIds;
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return (
    error instanceof Error &&
    error.name === "ApiClientError" &&
    "fieldErrors" in error
  );
}

export interface ShareEntry {
  readonly userId: string;
  readonly permission: "read" | "write";
}

export async function shareEntity(
  entityName: string,
  recordId: string,
  userId: string,
  permission: "read" | "write",
): Promise<{ readonly shared: boolean }> {
  return apiRequest<{ readonly shared: boolean }>(
    `/api/${entityName}/${recordId}/share`,
    { method: "POST", body: { userId, permission } },
  );
}

export async function unshareEntity(
  entityName: string,
  recordId: string,
  userId: string,
): Promise<{ readonly revoked: boolean }> {
  return apiRequest<{ readonly revoked: boolean }>(
    `/api/${entityName}/${recordId}/share/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export async function listShares(
  entityName: string,
  recordId: string,
): Promise<readonly ShareEntry[]> {
  return apiRequest<readonly ShareEntry[]>(
    `/api/${entityName}/${recordId}/share`,
  );
}

export async function getIndexProvisioningStatus(
  collection: string,
): Promise<IndexProvisioningStatusSummary> {
  return apiRequest<IndexProvisioningStatusSummary>("/api/indexes/status", {
    query: { collection },
  });
}

export async function getTenantIndexProvisioningStatus(): Promise<TenantIndexProvisioningStatus> {
  return apiRequest<TenantIndexProvisioningStatus>(
    "/api/indexes/tenant-status",
  );
}

import type { EntityFileReference } from "@repo/entities";

export interface FieldDefinitionInput {
  readonly name: string;
  readonly type:
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "relation"
    | "enum"
    | "image"
    | "document";
  readonly required?: boolean;
  readonly isArray?: boolean;
  readonly sensitive?: boolean;
  readonly relation?: {
    readonly target: string;
    readonly type:
      | "one-to-one"
      | "one-to-many"
      | "many-to-one"
      | "many-to-many";
    readonly onDelete?: "restrict" | "cascade" | "nullify";
  };
  readonly enumValues?: readonly string[];
  readonly numberKind?: "integer" | "decimal";
  readonly maxSizeBytes?: number;
  readonly defaultImage?: EntityFileReference & {
    readonly downloadUrl?: string;
  };
  readonly ui?: {
    readonly label?: string;
    readonly component?: string;
    readonly placeholder?: string;
    readonly displayFormat?: "currency" | "plain" | "percentage";
    readonly dateDisplayFormat?: "date" | "datetime" | "time";
    readonly order?: number;
    readonly filterable?: boolean;
    readonly sortable?: boolean;
    readonly searchable?: boolean;
  };
}

export interface EntityDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
  readonly emailMatchingEnabled?: boolean;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
  readonly displayField?: string;
  readonly ui?: EntityUIConfig;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CreateEntityDefinitionInput {
  readonly tenantId?: string;
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
  readonly emailMatchingEnabled?: boolean;
  readonly navCategoryId?: string;
  readonly navOrder?: number;
  readonly displayField?: string;
  readonly ui?: EntityUIConfig;
}

export async function listEntityDefinitions(options?: {
  readonly tenantId?: string;
}): Promise<{ readonly items: readonly EntityDefinitionRecord[] }> {
  return apiRequest<{ readonly items: readonly EntityDefinitionRecord[] }>(
    "/api/entity-definitions",
    {
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

export async function createEntityDefinition(
  input: CreateEntityDefinitionInput,
): Promise<EntityDefinitionRecord> {
  return apiRequest<EntityDefinitionRecord>("/api/entity-definitions", {
    method: "POST",
    body: input,
  });
}

export async function getEntityDefinition(
  id: string,
  options?: { readonly tenantId?: string },
): Promise<EntityDefinitionRecord> {
  return apiRequest<EntityDefinitionRecord>(`/api/entity-definitions/${id}`, {
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

interface PatchEntityDefinitionInput {
  readonly label?: string;
  readonly description?: string | null;
  readonly fields?: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
  readonly emailMatchingEnabled?: boolean;
  readonly navCategoryId?: string | null;
  readonly navOrder?: number | null;
  readonly displayField?: string | null;
  readonly ui?: EntityUIConfig;
}

export async function patchEntityDefinition(
  id: string,
  input: PatchEntityDefinitionInput,
  options?: { readonly tenantId?: string },
): Promise<EntityDefinitionRecord> {
  return apiRequest<EntityDefinitionRecord>(`/api/entity-definitions/${id}`, {
    method: "PATCH",
    body: input,
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

interface EntityDefinitionsCatalogReplaceInput {
  readonly kind: "entity-definitions-catalog";
  readonly version: 1;
  readonly exportedAt: string;
  readonly entityDefinitions: readonly CreateEntityDefinitionInput[];
}

interface EntityDefinitionsCatalogReplaceResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly categoryCounts?: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly EntityDefinitionRecord[];
}

export async function putEntityDefinitionsCatalog(
  input: EntityDefinitionsCatalogReplaceInput,
  options?: { readonly tenantId?: string },
): Promise<EntityDefinitionsCatalogReplaceResult> {
  return apiRequest<EntityDefinitionsCatalogReplaceResult>(
    "/api/entity-definitions/catalog",
    {
      method: "PUT",
      body: input,
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

export interface EntityCategoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly icon: string;
  readonly order: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listEntityCategories(options?: {
  readonly tenantId?: string;
}): Promise<{ readonly items: readonly EntityCategoryRecord[] }> {
  return apiRequest<{ readonly items: readonly EntityCategoryRecord[] }>(
    "/api/entity-categories",
    {
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

interface CreateEntityCategoryInput {
  readonly name: string;
  readonly icon: string;
  readonly order: number;
}

export async function createEntityCategory(
  input: CreateEntityCategoryInput,
): Promise<EntityCategoryRecord> {
  return apiRequest<EntityCategoryRecord>("/api/entity-categories", {
    method: "POST",
    body: input,
  });
}

interface PatchEntityCategoryInput {
  readonly name?: string;
  readonly icon?: string;
  readonly order?: number;
}

export async function patchEntityCategory(
  id: string,
  input: PatchEntityCategoryInput,
): Promise<EntityCategoryRecord> {
  return apiRequest<EntityCategoryRecord>(`/api/entity-categories/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteEntityCategory(id: string): Promise<void> {
  await apiRequest<void>(`/api/entity-categories/${id}`, {
    method: "DELETE",
  });
}

export interface MetricDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly metricId: string;
  readonly name: string;
  readonly description?: string;
  readonly computationMode?: "aggregated" | "computed";
  readonly sourceModel: string;
  readonly sourceQueryDefinitionId?: string;
  readonly filters: readonly {
    readonly field: string;
    readonly op: "eq" | "in";
    readonly value: string | number | boolean | readonly string[];
  }[];
  readonly groupBy: readonly string[];
  readonly dimensions: readonly string[];
  readonly dateFieldGranularity: Readonly<
    Record<string, "day" | "month" | "year">
  >;
  readonly valueDisplayFormat: "number" | "currency" | "percent";
  readonly parameters?: readonly {
    readonly name: string;
    readonly valueType: "dateBucket" | "string" | "number";
    readonly granularity?: "day" | "month" | "year";
    readonly deriveFrom?: {
      readonly parameter: string;
      readonly shift: {
        readonly unit: "day" | "month" | "year";
        readonly offset: number;
      };
    };
  }[];
  readonly computation?: Record<string, unknown>;
  readonly aggregations: readonly {
    readonly field?: string;
    readonly operation: "SUM" | "COUNT" | "AVG";
  }[];
  readonly target: {
    readonly collection: string;
    readonly granularity: string;
  };
  readonly version: number;
  readonly schemaVersionDependency: number;
  readonly fieldsDependency: readonly string[];
  readonly status: "ACTIVE" | "PAUSED";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listMetricDefinitions(): Promise<{
  readonly items: readonly MetricDefinitionRecord[];
}> {
  return apiRequest<{ readonly items: readonly MetricDefinitionRecord[] }>(
    "/api/metric-definitions",
  );
}

export async function getMetricDefinition(
  id: string,
): Promise<MetricDefinitionRecord> {
  return apiRequest<MetricDefinitionRecord>(`/api/metric-definitions/${id}`);
}

export interface MetricRowQuery {
  readonly group: Record<string, string | number | boolean>;
  readonly dimensions: Record<string, string | number | boolean>;
}

interface MetricRow {
  readonly values: Record<string, number>;
  readonly updatedAt: string;
}

type MetricRowResponse = MetricRow;

export function isMetricRowNotFoundError(
  error: unknown,
): error is ApiClientError {
  return (
    error instanceof Error &&
    error.name === "ApiClientError" &&
    (error as ApiClientError).code === "METRIC_ROW_NOT_FOUND"
  );
}

export async function fetchMetricRow(
  metricDefinitionId: string,
  query: MetricRowQuery,
): Promise<MetricRowResponse> {
  return apiRequest<MetricRowResponse>(
    `/api/metrics/${metricDefinitionId}/row`,
    {
      method: "POST",
      body: query,
    },
  );
}

export async function fetchMetricRowOrNull(
  metricDefinitionId: string,
  query: MetricRowQuery,
): Promise<MetricRowResponse | null> {
  const [row] = await fetchMetricBatch(metricDefinitionId, [query]);
  return row ?? null;
}

export async function fetchMetricBatch(
  metricDefinitionId: string,
  queries: readonly MetricRowQuery[],
): Promise<readonly (MetricRowResponse | null)[]> {
  const result = await apiRequest<{
    readonly items: readonly (MetricRowResponse | null)[];
  }>(`/api/metrics/${metricDefinitionId}/batch`, {
    method: "POST",
    body: { queries },
  });
  return result.items;
}

async function fetchMetricEvaluate(
  metricDefinitionId: string,
  parameters: Readonly<Record<string, unknown>>,
): Promise<MetricRowResponse> {
  return apiRequest<MetricRowResponse>(
    `/api/metrics/${metricDefinitionId}/evaluate`,
    {
      method: "POST",
      body: { parameters },
    },
  );
}

export async function fetchMetricEvaluateOrNull(
  metricDefinitionId: string,
  parameters: Readonly<Record<string, unknown>>,
): Promise<MetricRowResponse | null> {
  try {
    return await fetchMetricEvaluate(metricDefinitionId, parameters);
  } catch (error) {
    if (isMetricRowNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

type CreateMetricDefinitionInput = Omit<
  MetricDefinitionRecord,
  "id" | "tenantId" | "metricId" | "createdAt" | "updatedAt" | "target"
> & {
  readonly version?: number;
};

export async function createMetricDefinition(
  input: CreateMetricDefinitionInput,
): Promise<MetricDefinitionRecord> {
  return apiRequest<MetricDefinitionRecord>("/api/metric-definitions", {
    method: "POST",
    body: input,
  });
}

export async function patchMetricDefinition(
  id: string,
  input: Partial<
    Omit<
      MetricDefinitionRecord,
      "id" | "tenantId" | "metricId" | "createdAt" | "updatedAt" | "target"
    >
  >,
): Promise<MetricDefinitionRecord> {
  return apiRequest<MetricDefinitionRecord>(`/api/metric-definitions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function putMetricDefinitionsCatalog(
  input: MetricDefinitionsCatalogEnvelope,
): Promise<{
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly backfillSummary: {
    readonly created: number;
    readonly updated: number;
    readonly skipped: number;
    readonly failed: number;
  };
  readonly items: readonly MetricDefinitionRecord[];
}> {
  return apiRequest<{
    readonly counts: {
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    };
    readonly backfillSummary: {
      readonly created: number;
      readonly updated: number;
      readonly skipped: number;
      readonly failed: number;
    };
    readonly items: readonly MetricDefinitionRecord[];
  }>("/api/metric-definitions/catalog", {
    method: "PUT",
    body: input,
  });
}

import type { EntityQueryFilterNode } from "@repo/entity-queries/browser";

export interface EntityQueryDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly queryId: string;
  readonly name: string;
  readonly description?: string;
  readonly sourceEntity: string;
  readonly queryMode?: "records" | "aggregated";
  readonly parameters?: readonly {
    readonly name: string;
    readonly valueType: "dateBucket" | "scalar" | "stringList";
    readonly granularity?: "day" | "month" | "year";
    readonly field?: string;
  }[];
  readonly filter: EntityQueryFilterNode;
  readonly sort: readonly {
    readonly field: string;
    readonly direction: "asc" | "desc";
  }[];
  readonly select?: readonly string[];
  readonly groupBy?: readonly string[];
  readonly aggregations?: readonly {
    readonly operation: "SUM" | "COUNT" | "AVG";
    readonly field?: string;
  }[];
  readonly groupSort?: readonly {
    readonly field: string;
    readonly direction: "asc" | "desc";
  }[];
  readonly groupLimit?: number;
  readonly limitMode: "topN" | "all";
  readonly limit?: number;
  readonly status: "ACTIVE" | "PAUSED";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listEntityQueryDefinitions(): Promise<{
  readonly items: readonly EntityQueryDefinitionRecord[];
}> {
  return apiRequest<{ readonly items: readonly EntityQueryDefinitionRecord[] }>(
    "/api/entity-query-definitions",
  );
}

export async function getEntityQueryDefinition(
  id: string,
): Promise<EntityQueryDefinitionRecord> {
  return apiRequest<EntityQueryDefinitionRecord>(
    `/api/entity-query-definitions/${id}`,
  );
}

type CreateEntityQueryDefinitionInput = Omit<
  EntityQueryDefinitionRecord,
  "id" | "tenantId" | "queryId" | "createdAt" | "updatedAt"
>;

export async function createEntityQueryDefinition(
  input: CreateEntityQueryDefinitionInput,
): Promise<EntityQueryDefinitionRecord> {
  return apiRequest<EntityQueryDefinitionRecord>(
    "/api/entity-query-definitions",
    {
      method: "POST",
      body: input,
    },
  );
}

export async function patchEntityQueryDefinition(
  id: string,
  input: Partial<
    Omit<
      EntityQueryDefinitionRecord,
      "id" | "tenantId" | "queryId" | "createdAt" | "updatedAt" | "sourceEntity"
    >
  >,
): Promise<EntityQueryDefinitionRecord> {
  return apiRequest<EntityQueryDefinitionRecord>(
    `/api/entity-query-definitions/${id}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export async function deleteEntityQueryDefinition(id: string): Promise<void> {
  await apiRequest<{ readonly ok: boolean }>(
    `/api/entity-query-definitions/${id}`,
    {
      method: "DELETE",
    },
  );
}

export async function putEntityQueryDefinitionsCatalog(
  input: EntityQueryDefinitionsCatalogEnvelope,
): Promise<{
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly EntityQueryDefinitionRecord[];
}> {
  return apiRequest<{
    readonly counts: {
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    };
    readonly items: readonly EntityQueryDefinitionRecord[];
  }>("/api/entity-query-definitions/catalog", {
    method: "PUT",
    body: input,
  });
}

import type {
  ChartDefinitionRecord,
  CreateChartDefinitionInput,
  PatchChartDefinitionInput,
} from "@repo/chart-definitions";

export type {
  ChartDefinitionRecord,
  CreateChartDefinitionInput,
  PatchChartDefinitionInput,
};

export async function listChartDefinitions(): Promise<{
  readonly items: readonly ChartDefinitionRecord[];
}> {
  return apiRequest<{ readonly items: readonly ChartDefinitionRecord[] }>(
    "/api/chart-definitions",
  );
}

export async function createChartDefinition(
  input: CreateChartDefinitionInput,
): Promise<ChartDefinitionRecord> {
  return apiRequest<ChartDefinitionRecord>("/api/chart-definitions", {
    method: "POST",
    body: input,
  });
}

export async function patchChartDefinition(
  id: string,
  input: PatchChartDefinitionInput,
): Promise<ChartDefinitionRecord> {
  return apiRequest<ChartDefinitionRecord>(`/api/chart-definitions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export type DataHookDefinitionRecord = import("@repo/hooks").DataHookDefinition;
type CreateDataHookInput = import("@repo/hooks").CreateDataHookInput;
type PatchDataHookInput = import("@repo/hooks").PatchDataHookInput;

export async function listDataHooks(options?: {
  readonly entity?: string;
}): Promise<{ readonly items: readonly DataHookDefinitionRecord[] }> {
  return apiRequest<{ readonly items: readonly DataHookDefinitionRecord[] }>(
    "/api/data-hooks",
    options?.entity ? { query: { entity: options.entity } } : undefined,
  );
}

export async function createDataHook(
  input: CreateDataHookInput,
): Promise<DataHookDefinitionRecord> {
  return apiRequest<DataHookDefinitionRecord>("/api/data-hooks", {
    method: "POST",
    body: input,
  });
}

export async function patchDataHook(
  id: string,
  input: PatchDataHookInput,
): Promise<DataHookDefinitionRecord> {
  return apiRequest<DataHookDefinitionRecord>(`/api/data-hooks/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteDataHook(id: string): Promise<void> {
  await apiRequest<{ readonly id: string }>(`/api/data-hooks/${id}`, {
    method: "DELETE",
  });
}

type DataHooksCatalogEnvelope = import("@repo/hooks").DataHooksCatalogEnvelope;

export async function putDataHooksCatalog(
  input: DataHooksCatalogEnvelope,
  options?: { readonly entity?: string },
): Promise<{
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly DataHookDefinitionRecord[];
}> {
  return apiRequest<{
    readonly counts: {
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    };
    readonly items: readonly DataHookDefinitionRecord[];
  }>("/api/data-hooks/catalog", {
    method: "PUT",
    body: input,
    ...(options?.entity ? { query: { entity: options.entity } } : {}),
  });
}

export type CustomViewRecord = import("@repo/custom-views").CustomViewRecord;
type CreateCustomViewInput = import("@repo/custom-views").CreateCustomViewInput;
type PatchCustomViewInput = import("@repo/custom-views").PatchCustomViewInput;

export async function listCustomViews(): Promise<{
  readonly items: readonly CustomViewRecord[];
}> {
  return apiRequest<{ readonly items: readonly CustomViewRecord[] }>(
    "/api/custom-views",
  );
}

export async function createCustomView(
  input: CreateCustomViewInput,
): Promise<CustomViewRecord> {
  return apiRequest<CustomViewRecord>("/api/custom-views", {
    method: "POST",
    body: input,
  });
}

export async function patchCustomView(
  id: string,
  input: PatchCustomViewInput,
): Promise<CustomViewRecord> {
  return apiRequest<CustomViewRecord>(`/api/custom-views/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteCustomView(id: string): Promise<void> {
  await apiRequest<{ readonly ok: boolean }>(`/api/custom-views/${id}`, {
    method: "DELETE",
  });
}

type CustomViewsCatalogReplaceInput = CustomViewsCatalogEnvelope;

interface CustomViewsCatalogReplaceResult {
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly CustomViewRecord[];
}

export async function putCustomViewsCatalog(
  input: CustomViewsCatalogReplaceInput,
): Promise<CustomViewsCatalogReplaceResult> {
  return apiRequest<CustomViewsCatalogReplaceResult>(
    "/api/custom-views/catalog",
    {
      method: "PUT",
      body: input,
    },
  );
}

export interface TenantRoleRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly grants: readonly string[];
  readonly fieldRules?: readonly {
    readonly resource: string;
    readonly fields: readonly {
      readonly field: string;
      readonly access: "read" | "write" | "none";
    }[];
  }[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listRoles(options?: {
  readonly tenantId?: string;
}): Promise<{ readonly items: readonly TenantRoleRecord[] }> {
  return apiRequest<{ readonly items: readonly TenantRoleRecord[] }>(
    "/api/roles",
    {
      query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
    },
  );
}

export async function createRole(input: {
  readonly tenantId?: string;
  readonly name: string;
  readonly description?: string;
  readonly grants: readonly string[];
  readonly fieldRules?: TenantRoleRecord["fieldRules"];
}): Promise<TenantRoleRecord> {
  return apiRequest<TenantRoleRecord>("/api/roles", {
    method: "POST",
    body: input,
  });
}

export async function patchRole(
  id: string,
  input: {
    readonly description?: string;
    readonly grants?: readonly string[];
    readonly fieldRules?: TenantRoleRecord["fieldRules"];
  },
  options?: { readonly tenantId?: string },
): Promise<TenantRoleRecord> {
  return apiRequest<TenantRoleRecord>(`/api/roles/${id}`, {
    method: "PATCH",
    body: input,
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export interface TenantUserMember {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly roles: readonly string[];
}

export interface TenantUserInvite {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly createdAt: string;
}

export async function listTenantUsers(options?: {
  readonly tenantId?: string;
}): Promise<{
  readonly members: readonly TenantUserMember[];
  readonly invites: readonly TenantUserInvite[];
}> {
  return apiRequest<{
    members: readonly TenantUserMember[];
    invites: readonly TenantUserInvite[];
  }>("/api/tenant-users", {
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export async function createTenantUser(
  input: { readonly email: string; readonly roles: readonly string[] },
  options?: { readonly tenantId?: string },
): Promise<{
  readonly kind: "member" | "invite";
  readonly uid?: string;
  readonly id?: string;
}> {
  return apiRequest("/api/tenant-users", {
    method: "POST",
    body: input,
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export async function updateTenantUserRoles(
  uid: string,
  roles: readonly string[],
  options?: { readonly tenantId?: string },
): Promise<void> {
  await apiRequest(`/api/tenant-users/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    body: { roles },
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export async function removeTenantUser(
  uid: string,
  options?: { readonly tenantId?: string },
): Promise<void> {
  await apiRequest(`/api/tenant-users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export async function putEntityUiOverride(
  entityName: string,
  input: PutEntityUiOverrideInput,
): Promise<{ readonly override: EntityUiOverrideRecord }> {
  return apiRequest<{ readonly override: EntityUiOverrideRecord }>(
    `/api/entities/${encodeURIComponent(entityName)}/ui-override`,
    {
      method: "PUT",
      body: input,
    },
  );
}

export async function listUiBuilderPresets(): Promise<{
  readonly items: readonly UiBuilderPresetRecord[];
}> {
  return apiRequest<{ readonly items: readonly UiBuilderPresetRecord[] }>(
    "/api/ui-builder-presets",
  );
}

export async function createUiBuilderPreset(
  input: CreateUiBuilderPresetInput,
): Promise<{ readonly preset: UiBuilderPresetRecord }> {
  return apiRequest<{ readonly preset: UiBuilderPresetRecord }>(
    "/api/ui-builder-presets",
    {
      method: "POST",
      body: input,
    },
  );
}

export async function updateUiBuilderPreset(
  presetId: string,
  input: UpdateUiBuilderPresetInput,
): Promise<{ readonly preset: UiBuilderPresetRecord }> {
  return apiRequest<{ readonly preset: UiBuilderPresetRecord }>(
    `/api/ui-builder-presets/${encodeURIComponent(presetId)}`,
    {
      method: "PUT",
      body: input,
    },
  );
}

export async function deleteUiBuilderPreset(presetId: string): Promise<void> {
  await apiRequest(`/api/ui-builder-presets/${encodeURIComponent(presetId)}`, {
    method: "DELETE",
  });
}

export async function getTenantDashboardLayout(): Promise<{
  readonly config: TenantDashboardLayoutRecord;
}> {
  return apiRequest<{ readonly config: TenantDashboardLayoutRecord }>(
    "/api/tenant-dashboard-layout",
  );
}

export async function putTenantDashboardLayout(
  input: PutTenantDashboardLayoutInput,
): Promise<{ readonly config: TenantDashboardLayoutRecord }> {
  return apiRequest<{ readonly config: TenantDashboardLayoutRecord }>(
    "/api/tenant-dashboard-layout",
    {
      method: "PUT",
      body: input,
    },
  );
}

export async function uploadTenantDashboardLayoutImage(input: {
  readonly contentType: string;
  readonly data: string;
}): Promise<{ readonly imageUrl: string }> {
  return apiRequest<{ readonly imageUrl: string }>(
    "/api/tenant-dashboard-layout/upload-image",
    {
      method: "POST",
      body: input,
    },
  );
}

export type TenantSidebarLayoutGetResponse =
  | { readonly exists: false }
  | {
      readonly exists: true;
      readonly config: TenantSidebarLayoutRecord;
    };

export async function getTenantSidebarLayout(): Promise<TenantSidebarLayoutGetResponse> {
  return apiRequest<TenantSidebarLayoutGetResponse>(
    "/api/tenant-sidebar-layout",
  );
}

export async function putTenantSidebarLayout(
  input: PutTenantSidebarLayoutInput,
): Promise<{ readonly config: TenantSidebarLayoutRecord }> {
  return apiRequest<{ readonly config: TenantSidebarLayoutRecord }>(
    "/api/tenant-sidebar-layout",
    {
      method: "PUT",
      body: input,
    },
  );
}

export async function deleteTenantSidebarLayout(): Promise<{
  readonly deleted: boolean;
}> {
  return apiRequest<{ readonly deleted: boolean }>(
    "/api/tenant-sidebar-layout",
    {
      method: "DELETE",
    },
  );
}

export type AiJobStatus = "pending" | "running" | "completed" | "failed";

export interface AiJobProgress {
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly stepId: string;
  readonly stepLabel: string;
  readonly phase: string;
}

export interface UiBuilderJobDraft {
  readonly surface?: string;
  readonly outputMode?: "structure" | "render";
  readonly completedStepIds?: readonly string[];
  readonly listViewType?: string;
  readonly presentation?: string;
  readonly wizardSteps?: readonly {
    readonly id: string;
    readonly label: string;
  }[];
  readonly table?: { readonly fields?: readonly string[] };
  readonly expandableColumns?: readonly {
    readonly id: string;
    readonly label?: string;
  }[];
  readonly layoutTargets?: Readonly<
    Record<
      string,
      {
        readonly skeleton?: readonly unknown[];
        readonly componentConfigs?: Readonly<Record<string, unknown>>;
      }
    >
  >;
}

export interface AiJobStepTraceEntry {
  readonly stepId: string;
  readonly attempt: number;
  readonly systemInstruction: string;
  readonly contextBlocks: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly userText: string;
  readonly outputInstruction: string;
  readonly retryHint?: string;
  readonly rawModelAnswer: string;
  readonly parsedJson?: unknown;
  readonly validationErrors?: readonly string[];
  readonly validationOk: boolean;
  readonly durationMs?: number;
  readonly draftBeforeStep?: unknown;
  readonly draftAfterStep?: unknown;
}

export interface AiJobUiBuilderInput {
  readonly question: string;
  readonly entityName?: string;
  readonly surface?: string;
  readonly formPresentation?: string;
  readonly presentationHint?: string;
  readonly listViewType?: string;
}

export interface AiJobRecord {
  readonly id: string;
  readonly status: AiJobStatus;
  readonly feature: string;
  readonly input: AiJobUiBuilderInput | { readonly question: string };
  readonly output:
    | { readonly answer: string }
    | { readonly summary: string; readonly stepCount: number }
    | null;
  readonly error: string | null;
  readonly progress?: AiJobProgress | null;
  readonly draft?: UiBuilderJobDraft | null;
  readonly stepTrace?: readonly AiJobStepTraceEntry[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function submitAiChat(
  question: string,
): Promise<{ readonly jobId: string }> {
  return apiRequest<{ readonly jobId: string }>("/api/ai/chat", {
    method: "POST",
    body: { question },
  });
}

export async function getAiJob(jobId: string): Promise<AiJobRecord> {
  return apiRequest<AiJobRecord>(`/api/ai/jobs/${encodeURIComponent(jobId)}`);
}

export type DebugEventSource =
  | "ai"
  | "hookExecution"
  | "hookLog"
  | "audit"
  | "requestPerf"
  | "indexProvision"
  | "emailIngest";

export type DebugEventStatus =
  | "success"
  | "error"
  | "skipped"
  | "info"
  | "running"
  | "pending"
  | "failed"
  | "completed";

export interface DebugEvent {
  readonly id: string;
  readonly source: DebugEventSource;
  readonly timestamp: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly status?: DebugEventStatus;
  readonly summary?: Record<string, unknown>;
  readonly payload?: unknown;
}

export interface HookExecutionLiveCounts {
  readonly pending: number;
  readonly running: number;
  readonly queuedPending: number;
  readonly inlineRunning: number;
  readonly deferredRunning: number;
  readonly cloudRunning: number;
}

export async function listDebugEvents(options?: {
  readonly limit?: number;
  readonly sources?: readonly string[];
  readonly cursor?: string;
  readonly since?: string;
  readonly until?: string;
  readonly before?: string;
  readonly after?: string;
  readonly entityName?: string;
  readonly recordId?: string;
  readonly emailLedgerId?: string;
}): Promise<{
  readonly items: readonly DebugEvent[];
  readonly hookExecutionLive?: HookExecutionLiveCounts;
  readonly nextCursor?: string;
}> {
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options?.sources && options.sources.length > 0) {
    params.set("sources", options.sources.join(","));
  }
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  if (options?.since) {
    params.set("since", options.since);
  }
  if (options?.until) {
    params.set("until", options.until);
  }
  if (options?.before) {
    params.set("before", options.before);
  }
  if (options?.after) {
    params.set("after", options.after);
  }
  if (options?.entityName) {
    params.set("entityName", options.entityName);
  }
  if (options?.recordId) {
    params.set("recordId", options.recordId);
  }
  if (options?.emailLedgerId) {
    params.set("emailLedgerId", options.emailLedgerId);
  }
  const query = params.toString();
  return apiRequest(`/api/debug/events${query ? `?${query}` : ""}`);
}

export interface DebugEventsSummaryAttentionItem {
  readonly id: string;
  readonly source: DebugEventSource;
  readonly title: string;
  readonly timestamp: string;
  readonly status?: DebugEventStatus;
  readonly subtitle?: string;
}

export interface DebugEventsSummary {
  readonly source: DebugEventSource;
  readonly total: number;
  readonly scannedCount: number;
  readonly truncated: boolean;
  readonly statusCounts: Partial<Record<DebugEventStatus, number>>;
  readonly errorRate: number | null;
  readonly inProgressCount: number;
  readonly avgDurationMs: number | null;
  readonly totalWrites: number | null;
  readonly writesCreated: number | null;
  readonly writesUpdated: number | null;
  readonly writesDeleted: number | null;
  readonly writeExecutionCount: number | null;
  readonly avgTotalMs: number | null;
  readonly avgHooksMs: number | null;
  readonly avgQueryMs: number | null;
  readonly uniqueActors: number | null;
  readonly emailIngestFetched: number | null;
  readonly emailIngestQueued: number | null;
  readonly emailIngestProcessing: number | null;
  readonly emailIngestFinished: number | null;
  readonly emailIngestProcessed: number | null;
  readonly emailIngestFailedMessages: number | null;
  readonly barCharts: readonly {
    readonly id: string;
    readonly titleKey: string;
    readonly groups: readonly {
      readonly key: string;
      readonly label: string;
      readonly count: number;
      readonly errorCount?: number;
    }[];
  }[];
  readonly timelineBuckets: readonly {
    readonly label: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly total: number;
    readonly errors: number;
  }[];
  readonly attentionItems: readonly DebugEventsSummaryAttentionItem[];
  readonly hookExecutionLive?: HookExecutionLiveCounts;
}

export async function getDebugEventsSummary(options: {
  readonly sources: readonly string[];
  readonly since: string;
  readonly until: string;
}): Promise<DebugEventsSummary> {
  const params = new URLSearchParams();
  params.set("sources", options.sources.join(","));
  params.set("since", options.since);
  params.set("until", options.until);
  return apiRequest(`/api/debug/events/summary?${params.toString()}`);
}

export interface UserNotificationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly message: string;
  readonly level: "info" | "error";
  readonly read: boolean;
  readonly readAt?: string;
  readonly createdAt: string;
  readonly hookId?: string;
  readonly hookName?: string;
  readonly entityName?: string;
  readonly recordId?: string;
  readonly event?: string;
}

export async function listNotifications(options?: {
  readonly limit?: number;
  readonly cursor?: string;
  readonly unreadOnly?: boolean;
}): Promise<{
  readonly items: readonly UserNotificationRecord[];
  readonly nextCursor: string | null;
}> {
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  if (options?.unreadOnly) {
    params.set("unreadOnly", "true");
  }
  const query = params.toString();
  return apiRequest(`/api/notifications${query ? `?${query}` : ""}`);
}

export async function getUnreadNotificationCount(): Promise<{
  readonly unreadCount: number;
}> {
  return apiRequest("/api/notifications/unread-count");
}

export async function markNotificationRead(
  id: string,
): Promise<UserNotificationRecord> {
  return apiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{
  readonly updatedCount: number;
}> {
  return apiRequest("/api/notifications/read-all", {
    method: "PATCH",
  });
}

export async function upsertPushToken(input: {
  readonly token: string;
  readonly userAgent?: string;
}): Promise<{
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly token: string;
  readonly userAgent?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}> {
  return apiRequest("/api/push-tokens", {
    method: "PUT",
    body: input,
  });
}

export async function listPushTokens(): Promise<{
  readonly items: readonly {
    readonly id: string;
    readonly tenantId: string;
    readonly userId: string;
    readonly token: string;
    readonly userAgent?: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }[];
}> {
  return apiRequest("/api/push-tokens");
}

export async function deletePushToken(input: {
  readonly token: string;
}): Promise<{ readonly deleted: boolean }> {
  return apiRequest("/api/push-tokens", {
    method: "DELETE",
    body: input,
  });
}

interface DataHookExecutionRecord {
  readonly id: string;
  readonly hookId: string;
  readonly hookName: string;
  readonly entityName: string;
  readonly event: string;
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly writesCreated?: number;
  readonly writesUpdated?: number;
  readonly writesDeleted?: number;
  readonly error?: string;
}

export async function listDataHookExecutions(
  hookId: string,
  options?: { readonly limit?: number; readonly cursor?: string },
): Promise<{
  readonly items: readonly DataHookExecutionRecord[];
  readonly nextCursor?: string;
}> {
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set("limit", String(options.limit));
  }
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  const query = params.toString();
  return apiRequest(
    `/api/data-hooks/${encodeURIComponent(hookId)}/executions${query ? `?${query}` : ""}`,
  );
}

export async function getDebugAiJob(jobId: string): Promise<AiJobRecord> {
  return apiRequest(`/api/debug/ai-jobs/${encodeURIComponent(jobId)}`);
}

export interface EmailIngestRunMetrics {
  readonly fetched: number;
  readonly queued: number;
  readonly processing: number;
  readonly finished: number;
  readonly processed: number;
  readonly skippedDedup: number;
  readonly skippedNoMatch: number;
  readonly skippedIrrelevant: number;
  readonly failed: number;
}

export interface EmailIngestStepTraceEntry {
  readonly stepId: string;
  readonly timestamp: string;
  readonly status: "info" | "success" | "error" | "skipped";
  readonly message: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface EmailIngestJobRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly kind: "windowSync" | "watchRenew" | "processMessage";
  readonly status: "pending" | "running" | "completed" | "failed";
  readonly title: string;
  readonly stepTrace: readonly EmailIngestStepTraceEntry[];
  readonly runMetrics: EmailIngestRunMetrics;
  readonly windowQuery?: string | null;
  readonly errorMessage?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string | null;
}

export async function getDebugEmailIngestJob(
  jobId: string,
): Promise<EmailIngestJobRecord> {
  return apiRequest(`/api/debug/email-ingest/${encodeURIComponent(jobId)}`);
}

export interface SubmitAiUiBuilderInput {
  readonly question: string;
  readonly entityName: string;
  readonly surface:
    | "list"
    | "forms"
    | "mainPage"
    | "recordDetail"
    | "metricsRowDesigner";
  readonly listViewType?: "card" | "expandableTable";
  readonly presentationHint?: "plain" | "wizard";
  readonly formPresentation?: "plain" | "wizard";
  readonly allowCreative?: boolean;
  readonly currentLayoutJson?: string;
  readonly outputMode?: "structure" | "render";
  readonly parentSuggestionId?: string;
  readonly modificationRequest?: string;
}

export async function submitAiUiBuilder(
  input: SubmitAiUiBuilderInput,
): Promise<{ readonly jobId: string }> {
  return apiRequest<{ readonly jobId: string }>("/api/ai/ui-builder", {
    method: "POST",
    body: input,
  });
}

export type UiBuilderSuggestionStatus = "ready" | "failed";

export interface UiBuilderSuggestionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly entityName: string;
  readonly surface: string;
  readonly listViewType?: "card" | "expandableTable";
  readonly jobId: string;
  readonly status: UiBuilderSuggestionStatus;
  readonly userContext?: string;
  readonly sliceData?: import("@repo/entities").ListSliceData;
  readonly validationErrors?: readonly {
    readonly path: string;
    readonly message: string;
  }[];
  readonly rawAnswer?: string;
  readonly outputMode?: "structure" | "render";
  readonly imageUrl?: string;
  readonly imageStoragePath?: string;
  readonly renderPrompt?: string;
  readonly renderBrief?: string;
  readonly renderHtml?: string;
  readonly parentSuggestionId?: string;
  readonly iterationNumber?: number;
  readonly critiqueNotes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listUiBuilderAiSuggestions(
  entityName: string,
  surface = "list",
): Promise<{ readonly suggestions: readonly UiBuilderSuggestionRecord[] }> {
  return apiRequest<{
    readonly suggestions: readonly UiBuilderSuggestionRecord[];
  }>(
    `/api/entities/${encodeURIComponent(entityName)}/ui-builder/ai-suggestions?surface=${encodeURIComponent(surface)}`,
  );
}

export interface FormulaDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string;
  readonly inputs: readonly {
    readonly name: string;
    readonly description?: string;
    readonly required?: boolean;
  }[];
  readonly body: import("@repo/hooks").ExpressionNode;
  readonly enabled: boolean;
  readonly source: "platform" | "tenant";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listFormulaDefinitions(): Promise<{
  readonly items: readonly FormulaDefinitionRecord[];
}> {
  return apiRequest<{ readonly items: readonly FormulaDefinitionRecord[] }>(
    "/api/formula-definitions",
  );
}

type CreateFormulaDefinitionInput = Omit<
  FormulaDefinitionRecord,
  "id" | "tenantId" | "source" | "createdAt" | "updatedAt"
>;

export async function createFormulaDefinition(
  input: CreateFormulaDefinitionInput,
): Promise<FormulaDefinitionRecord> {
  return apiRequest<FormulaDefinitionRecord>("/api/formula-definitions", {
    method: "POST",
    body: input,
  });
}

export async function updateFormulaDefinition(
  id: string,
  input: Partial<CreateFormulaDefinitionInput>,
): Promise<FormulaDefinitionRecord> {
  return apiRequest<FormulaDefinitionRecord>(`/api/formula-definitions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteFormulaDefinition(id: string): Promise<void> {
  await apiRequest<void>(`/api/formula-definitions/${id}`, {
    method: "DELETE",
  });
}

export async function replaceFormulaDefinitionsCatalog(body: unknown): Promise<{
  readonly counts: {
    readonly created: number;
    readonly updated: number;
    readonly deleted: number;
  };
  readonly items: readonly FormulaDefinitionRecord[];
}> {
  return apiRequest<{
    readonly counts: {
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    };
    readonly items: readonly FormulaDefinitionRecord[];
  }>("/api/formula-definitions/catalog", {
    method: "PUT",
    body,
  });
}

interface GmailConnectionStatus {
  readonly connected: boolean;
  readonly status: string;
  readonly emailAddress: string | null;
  readonly scopes: readonly string[];
  readonly lastSyncAt: string | null;
  readonly ingestWatermarkAt: string | null;
  readonly watchExpiration: string | null;
  readonly lastError: string | null;
}

export interface EmailMatchBindingRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly enabled: boolean;
  readonly catchupNeeded?: boolean;
  readonly order: number;
  readonly ingestMode: "create" | "link";
  readonly fromAddresses: readonly string[];
  readonly subjectPatterns: readonly string[];
  readonly bodyPatterns: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: readonly {
    readonly field: string;
    readonly label?: string;
    readonly pattern?: string;
    readonly captureGroup?: number;
    readonly transform?:
      | "trim"
      | "amount"
      | "slashDate"
      | "compactYmd"
      | "monthNameDate"
      | "valueMap"
      | "literal"
      | "collapseWhitespace";
    readonly valueMap?: Readonly<Record<string, string>>;
    readonly literal?: string;
    readonly sufficientForRelevance?: boolean;
  }[];
  readonly attachmentImport?: {
    readonly enabled: boolean;
    readonly documentType: string;
    readonly documentDateField?: string;
    readonly recordIdField?: string;
  } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function getGmailStatus(): Promise<GmailConnectionStatus> {
  return apiRequest<GmailConnectionStatus>("/api/gmail/status");
}

export async function startGmailConnect(): Promise<{
  readonly authorizeUrl: string;
}> {
  return apiRequest<{ readonly authorizeUrl: string }>("/api/gmail/connect", {
    method: "POST",
    body: { returnOrigin: window.location.origin },
  });
}

export async function disconnectGmail(): Promise<{
  readonly disconnected: boolean;
}> {
  return apiRequest<{ readonly disconnected: boolean }>(
    "/api/gmail/disconnect",
    { method: "POST", body: {} },
  );
}

export async function startGmailSync(options?: {
  readonly bindingId?: string;
}): Promise<{ readonly jobId: string }> {
  return apiRequest<{ readonly jobId: string }>("/api/gmail/sync", {
    method: "POST",
    body: options?.bindingId ? { bindingId: options.bindingId } : {},
  });
}

export async function listEmailMatchBindings(options?: {
  readonly entityName?: string;
  readonly recordId?: string;
}): Promise<{ readonly items: readonly EmailMatchBindingRecord[] }> {
  const params = new URLSearchParams();
  if (options?.entityName) params.set("entityName", options.entityName);
  if (options?.recordId) params.set("recordId", options.recordId);
  const query = params.toString();
  return apiRequest<{ readonly items: readonly EmailMatchBindingRecord[] }>(
    `/api/gmail/bindings${query ? `?${query}` : ""}`,
  );
}

export async function createEmailMatchBinding(input: {
  readonly entityName: string;
  readonly recordId: string;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly enabled?: boolean;
  readonly order?: number;
  readonly ingestMode?: "create" | "link";
  readonly fromAddresses?: readonly string[];
  readonly subjectPatterns?: readonly string[];
  readonly bodyPatterns?: readonly string[];
  readonly gmailQueryExtra?: string | null;
  readonly useAi?: boolean;
  readonly aiInstructions?: string | null;
  readonly bodyFieldExtractors?: EmailMatchBindingRecord["bodyFieldExtractors"];
  readonly attachmentImport?: EmailMatchBindingRecord["attachmentImport"];
}): Promise<EmailMatchBindingRecord> {
  return apiRequest<EmailMatchBindingRecord>("/api/gmail/bindings", {
    method: "POST",
    body: input,
  });
}

export async function patchEmailMatchBinding(
  bindingId: string,
  input: Partial<{
    name: string | null;
    description: string | null;
    enabled: boolean;
    catchupNeeded: boolean;
    order: number;
    ingestMode: "create" | "link";
    fromAddresses: readonly string[];
    subjectPatterns: readonly string[];
    bodyPatterns: readonly string[];
    gmailQueryExtra: string | null;
    useAi: boolean;
    aiInstructions: string | null;
    bodyFieldExtractors: EmailMatchBindingRecord["bodyFieldExtractors"];
    attachmentImport: EmailMatchBindingRecord["attachmentImport"];
  }>,
): Promise<EmailMatchBindingRecord> {
  return apiRequest<EmailMatchBindingRecord>(
    `/api/gmail/bindings/${encodeURIComponent(bindingId)}`,
    { method: "PATCH", body: input },
  );
}

export async function deleteEmailMatchBinding(
  bindingId: string,
): Promise<{ readonly deleted: boolean }> {
  return apiRequest<{ readonly deleted: boolean }>(
    `/api/gmail/bindings/${encodeURIComponent(bindingId)}`,
    { method: "DELETE" },
  );
}
