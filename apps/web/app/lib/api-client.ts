import type { SerializableEntityDefinition } from "@repo/entities";
import type { QueryConfig } from "@repo/query-engine";

import { appConfig } from "../config/app-config";
import { getAppCheckHeaderValue } from "./app-check";
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

interface ApiClientError extends Error {
  statusCode: number;
  code: string;
  fieldErrors: Record<string, string>;
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

  const response = await fetch(url, {
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
    },
  });
}

export async function getEntity<T>(entityName: string, id: string): Promise<T> {
  return apiRequest<T>(`/api/${entityName}/${id}`);
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

export interface FieldDefinitionInput {
  readonly name: string;
  readonly type: "string" | "number" | "boolean" | "date" | "relation" | "enum";
  readonly required?: boolean;
  readonly sensitive?: boolean;
  readonly relation?: {
    readonly target: string;
    readonly type:
      | "one-to-one"
      | "one-to-many"
      | "many-to-one"
      | "many-to-many";
  };
  readonly enumValues?: readonly string[];
  readonly ui?: {
    readonly label?: string;
    readonly component?: string;
    readonly placeholder?: string;
    readonly displayFormat?: "currency" | "plain";
    readonly dateDisplayFormat?: "date" | "datetime" | "time";
    readonly order?: number;
    readonly filterable?: boolean;
    readonly sortable?: boolean;
  };
}

export interface EntityDefinitionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly label: string;
  readonly fields: readonly FieldDefinitionInput[];
  readonly tenantWideRead?: boolean;
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
  readonly ui?: Record<string, unknown>;
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
