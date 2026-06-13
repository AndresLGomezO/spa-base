import type {
  CreateUiBuilderPresetInput,
  EntityUIConfig,
  EntityUiOverrideRecord,
  SerializableEntityDefinition,
  UiBuilderPresetRecord,
  UpdateUiBuilderPresetInput,
  ViewConfig,
} from "@repo/entities";
import type { QueryConfig } from "@repo/query-engine";

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

const INDEX_LIST_ERROR_CODES = new Set([
  "INDEX_CREATING",
  "COMPOSITE_INDEX_REQUIRED",
  "INDEX_PROVISIONING_FAILED",
]);

export function isIndexListErrorCode(code: string): boolean {
  return INDEX_LIST_ERROR_CODES.has(code);
}

export function isTransientIndexListError(code: string): boolean {
  return code === "INDEX_CREATING";
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
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
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
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
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
  readonly fields?: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
  readonly inMemoryListQueries?: boolean;
  readonly hiddenFromNav?: boolean;
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

export type HookAction =
  | {
      readonly type: "updateField";
      readonly field: string;
      readonly value: unknown;
    }
  | {
      readonly type: "createRecord";
      readonly entity: string;
      readonly data: Record<string, unknown>;
    }
  | {
      readonly type: "sendNotification";
      readonly message: string;
    };

export interface HookRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly entity: string;
  readonly event: string;
  readonly type: "action";
  readonly config: {
    readonly actions: readonly HookAction[];
  };
  readonly enabled: boolean;
  readonly order: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listHooks(options?: {
  readonly tenantId?: string;
}): Promise<{ readonly items: readonly HookRecord[] }> {
  return apiRequest<{ readonly items: readonly HookRecord[] }>("/api/hooks", {
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

interface CreateHookInput {
  readonly tenantId?: string;
  readonly name: string;
  readonly entity: string;
  readonly event: string;
  readonly type: "action";
  readonly config: {
    readonly actions: readonly HookAction[];
  };
  readonly enabled?: boolean;
  readonly order?: number;
}

export async function createHook(input: CreateHookInput): Promise<HookRecord> {
  return apiRequest<HookRecord>("/api/hooks", {
    method: "POST",
    body: input,
  });
}

interface PatchHookInput {
  readonly name?: string;
  readonly config?: {
    readonly actions: readonly HookAction[];
  };
  readonly enabled?: boolean;
  readonly order?: number;
}

export async function patchHook(
  id: string,
  input: PatchHookInput,
  options?: { readonly tenantId?: string },
): Promise<HookRecord> {
  return apiRequest<HookRecord>(`/api/hooks/${id}`, {
    method: "PATCH",
    body: input,
    query: options?.tenantId ? { tenantId: options.tenantId } : undefined,
  });
}

export interface MetricDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly metricId: string;
  readonly name: string;
  readonly description?: string;
  readonly sourceModel: string;
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
  readonly valueDisplayFormat: "number" | "currency";
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
  try {
    return await fetchMetricRow(metricDefinitionId, query);
  } catch (error) {
    if (isMetricRowNotFoundError(error)) {
      return null;
    }
    throw error;
  }
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

export async function backfillMetricDefinition(
  id: string,
  input?: {
    readonly previousVersion: number;
    readonly changedDefinitionFields?: readonly string[];
  },
): Promise<{
  readonly processedEvents: number;
  readonly processedDocuments?: number;
}> {
  return apiRequest<{
    readonly processedEvents: number;
    readonly processedDocuments?: number;
  }>(`/api/metric-definitions/${id}/backfill`, {
    method: "POST",
    body: input ?? {},
  });
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
  input: {
    readonly views: readonly ViewConfig[];
    readonly listViewType?: "table" | "card" | "expandableTable" | "compact";
    readonly listItem?: import("@repo/ui-builder-core").UiLayoutDocument;
    readonly mainPage?: import("@repo/ui-builder-core").UiLayoutDocument;
    readonly recordDetail?: import("@repo/ui-builder-core").UiLayoutDocument;
    readonly metricWidgets?: readonly import("@repo/entities").MetricWidgetDefinition[];
    readonly metricRowLayout?: import("@repo/ui-builder-core").UiLayoutDocument;
    readonly forms?: {
      readonly presentation?: "plain" | "wizard";
      readonly modalSize?: "sm" | "md" | "lg" | "xl" | "2xl";
      readonly modalSizeByBreakpoint?: {
        readonly base?: "sm" | "md" | "lg" | "xl" | "2xl";
        readonly sm?: "sm" | "md" | "lg" | "xl" | "2xl";
        readonly md?: "sm" | "md" | "lg" | "xl" | "2xl";
        readonly lg?: "sm" | "md" | "lg" | "xl" | "2xl";
        readonly xl?: "sm" | "md" | "lg" | "xl" | "2xl";
      };
      readonly modalChrome?: {
        readonly showHeader?: boolean;
        readonly contentPadding?: "default" | "none";
      };
      readonly modalFooterLayout?: import("@repo/ui-builder-core").UiLayoutDocument;
      readonly layout?: import("@repo/ui-builder-core").UiLayoutDocument;
      readonly wizard?: {
        readonly shellLayout: import("@repo/ui-builder-core").UiLayoutDocument;
        readonly steps: readonly {
          readonly id: string;
          readonly label: string;
          readonly subtitle?: string;
          readonly icon?: string;
          readonly layout: import("@repo/ui-builder-core").UiLayoutDocument;
        }[];
      };
      readonly create?: import("@repo/ui-builder-core").UiLayoutDocument;
      readonly edit?: import("@repo/ui-builder-core").UiLayoutDocument;
    };
  },
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

export type AiJobStatus = "pending" | "running" | "completed" | "failed";

export interface AiJobProgress {
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly stepId: string;
  readonly stepLabel: string;
  readonly phase: string;
}

export interface AiJobRecord {
  readonly id: string;
  readonly status: AiJobStatus;
  readonly feature: string;
  readonly input: { readonly question: string };
  readonly output:
    | { readonly answer: string }
    | { readonly summary: string; readonly stepCount: number }
    | null;
  readonly error: string | null;
  readonly progress?: AiJobProgress | null;
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

export interface SubmitAiUiBuilderInput {
  readonly question: string;
  readonly entityName: string;
  readonly surface:
    | "list"
    | "forms"
    | "mainPage"
    | "recordDetail"
    | "metricsRowDesigner";
  readonly listViewType?: "table" | "card" | "expandableTable";
  readonly formPresentation?: "plain" | "wizard";
  readonly currentLayoutJson?: string;
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
  readonly listViewType?: "table" | "card" | "expandableTable";
  readonly jobId: string;
  readonly status: UiBuilderSuggestionStatus;
  readonly userContext?: string;
  readonly sliceData?: import("@repo/entities").ListSliceData;
  readonly validationErrors?: readonly {
    readonly path: string;
    readonly message: string;
  }[];
  readonly rawAnswer?: string;
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
