import type { TenantAppearance } from "@repo/shared-types";
import type {
  TenantBundleExportDocument,
  TenantBundleImportCounts,
} from "@repo/tenant-bundle/browser";

import { getAppCheckHeaderValue } from "./app-check";
import { appConfig } from "../config/app-config";
import { auth } from "./firebase";

interface AdminTenant {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "suspended";
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly defaultLocale?: string;
  readonly appearance?: TenantAppearance;
  readonly aiLimits?: {
    readonly monthlyInputTokens?: number;
    readonly monthlyOutputTokens?: number;
    readonly monthlyBudgetUsd?: number;
  };
}

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated.");
  }

  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(),
    getAppCheckHeaderValue(),
  ]);

  return {
    Authorization: `Bearer ${idToken}`,
    "X-Firebase-AppCheck": appCheckToken,
  };
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(new URL(path, appConfig.apiBaseUrl), {
    ...init,
    headers: {
      ...headers,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as T & {
    ok?: boolean;
    message?: string;
  };

  if (!response.ok || payload.ok === false) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "Admin request failed.";
    throw new Error(message);
  }

  return payload;
}

export async function getAdminTenant(id: string): Promise<AdminTenant> {
  const payload = await adminFetch<{ tenant: AdminTenant }>(
    `/admin/tenants/${encodeURIComponent(id)}`,
  );
  return payload.tenant;
}

export async function createAdminTenant(input: {
  readonly id?: string;
  readonly name: string;
}): Promise<AdminTenant> {
  const payload = await adminFetch<{ tenant: AdminTenant }>("/admin/tenants", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.tenant;
}

export async function updateAdminTenant(
  id: string,
  input: {
    readonly name?: string;
    readonly status?: "active" | "suspended";
    readonly appearance?: TenantAppearance | null;
    readonly aiLimits?: AdminTenant["aiLimits"] | null;
    readonly defaultLocale?: string;
  },
): Promise<AdminTenant> {
  const payload = await adminFetch<{ tenant: AdminTenant }>(
    `/admin/tenants/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return payload.tenant;
}

export async function uploadTenantLogo(
  id: string,
  input: {
    readonly contentType: string;
    readonly data: string;
  },
): Promise<{ readonly logoUrl: string; readonly tenant: AdminTenant }> {
  return adminFetch(`/admin/tenants/${encodeURIComponent(id)}/logo`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

interface AdminTenantBundleImportSummary {
  readonly sourceTenantId: string;
  readonly counts: TenantBundleImportCounts;
}

export async function exportAdminTenantBundle(
  tenantId: string,
): Promise<TenantBundleExportDocument> {
  const payload = await adminFetch<{ bundle: TenantBundleExportDocument }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/bundle`,
  );
  return payload.bundle;
}

export async function importAdminTenantBundle(
  tenantId: string,
  bundle: TenantBundleExportDocument,
): Promise<AdminTenantBundleImportSummary> {
  const payload = await adminFetch<{ summary: AdminTenantBundleImportSummary }>(
    `/admin/tenants/${encodeURIComponent(tenantId)}/bundle`,
    {
      method: "POST",
      body: JSON.stringify({ bundle }),
    },
  );
  return payload.summary;
}

export interface TenantDeletionJob {
  readonly id: string;
  readonly tenantId: string;
  readonly archiveId: string;
  readonly status: "queued" | "running" | "completed" | "failed";
  readonly deletedBy: string | null;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly error: string | null;
  readonly progress: {
    readonly collectionsCopied: number;
    readonly docsCopied: number;
    readonly docsDeleted: number;
  };
}

export async function deleteAdminTenant(
  tenantId: string,
  input: { readonly confirmTenantId: string },
): Promise<{ readonly jobId: string; readonly archiveId: string }> {
  const payload = await adminFetch<{
    jobId: string;
    archiveId: string;
  }>(`/admin/tenants/${encodeURIComponent(tenantId)}/delete`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    jobId: payload.jobId,
    archiveId: payload.archiveId,
  };
}

export async function getTenantDeletionJob(
  jobId: string,
): Promise<TenantDeletionJob> {
  const payload = await adminFetch<{ job: TenantDeletionJob }>(
    `/admin/tenant-deletion-jobs/${encodeURIComponent(jobId)}`,
  );
  return payload.job;
}

export type { AdminTenant };

// --- Workload Manager types ---

export type WorkloadKind =
  | "cloudTasksQueue"
  | "schedulerJob"
  | "pubsubSubscription"
  | "scheduledDataHook"
  | "workerRoute"
  | "inProcessScheduler";

export type WorkloadSource = "system" | "hook" | "integration";
type WorkloadDomain = "ai" | "email" | "platform" | "metrics" | "tenant";
export type WorkloadStatus =
  | "running"
  | "ready"
  | "paused"
  | "disabled"
  | "unknown";
export type WorkloadAction =
  | "pause"
  | "resume"
  | "runNow"
  | "enable"
  | "disable";

interface WorkloadSchedule {
  readonly cron: string;
  readonly timezone?: string;
}

interface WorkloadRecord {
  readonly id: string;
  readonly kind: WorkloadKind;
  readonly source: WorkloadSource;
  readonly domain: WorkloadDomain;
  readonly displayName: string;
  readonly description?: string;
  readonly actions: readonly WorkloadAction[];
  readonly gcp?: Record<string, unknown>;
  readonly schedule?: WorkloadSchedule;
  readonly route?: string;
  readonly sourceFile?: string;
  readonly disableHint?: string;
  readonly controlledBy?: readonly string[];
  readonly enabled?: boolean;
}

export interface WorkloadState {
  readonly status: WorkloadStatus;
  readonly live?: Record<string, unknown>;
  readonly fetchedAt: string;
  readonly error?: string;
}

export interface WorkloadWithState extends WorkloadRecord {
  readonly state: WorkloadState;
  /** Google Cloud Console deep-link; only present when API is not in local mode. */
  readonly gcpConsoleUrl?: string;
}

export interface WorkloadStats24h {
  readonly success: number;
  readonly error: number;
  readonly timeout: number;
  readonly running: number;
  readonly cancelled: number;
}

export interface WorkloadRunArtifactRef {
  readonly kind:
    | "hookExecution"
    | "aiJob"
    | "emailIngestJob"
    | "tenantDeletionJob"
    | "workloadRun";
  readonly id: string;
  readonly tenantId?: string;
  readonly status?: string;
}

export interface WorkloadRunRecord {
  readonly id: string;
  readonly workloadId: string;
  readonly tenantId?: string;
  readonly triggeredBy: string;
  readonly triggerContext?: Record<string, unknown>;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly durationMs?: number;
  readonly status: string;
  readonly error?: string;
  readonly metrics?: Record<string, unknown>;
  readonly artifactRefs?: readonly WorkloadRunArtifactRef[];
  readonly parentRunId?: string;
  readonly rootRunId?: string;
  readonly logExcerpt?: string | readonly string[];
  readonly cloudLoggingUrl?: string;
}

interface WorkloadRunLogEntry {
  readonly timestamp: string;
  readonly severity?: string;
  readonly message: string;
}

interface WorkloadFilters {
  /** Single kind or comma-separated kinds. */
  readonly kind?: WorkloadKind | string;
  /** Single source or comma-separated sources. */
  readonly source?: WorkloadSource | string;
  /** Single status or comma-separated statuses. */
  readonly status?: WorkloadStatus | string;
  readonly q?: string;
}

interface WorkloadRunFilters {
  readonly since?: string;
  readonly until?: string;
  readonly status?: string;
  readonly triggeredBy?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export async function listWorkloads(
  filters?: WorkloadFilters,
): Promise<WorkloadWithState[]> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  const path = `/admin/workloads${qs ? `?${qs}` : ""}`;
  const payload = await adminFetch<{ workloads: WorkloadWithState[] }>(path);
  return payload.workloads;
}

export async function getWorkload(
  id: string,
): Promise<{ workload: WorkloadWithState; stats24h?: WorkloadStats24h }> {
  return adminFetch<{
    workload: WorkloadWithState;
    stats24h?: WorkloadStats24h;
  }>(`/admin/workloads/${encodeURIComponent(id)}`);
}

export async function applyWorkloadAction(
  id: string,
  action: WorkloadAction,
): Promise<WorkloadWithState> {
  const payload = await adminFetch<{ workload: WorkloadWithState }>(
    `/admin/workloads/${encodeURIComponent(id)}/actions/${encodeURIComponent(action)}`,
    { method: "POST" },
  );
  return payload.workload;
}

export async function listWorkloadRuns(
  id: string,
  filters?: WorkloadRunFilters,
): Promise<{ items: WorkloadRunRecord[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (filters?.since) params.set("since", filters.since);
  if (filters?.until) params.set("until", filters.until);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.triggeredBy) params.set("triggeredBy", filters.triggeredBy);
  if (filters?.cursor) params.set("cursor", filters.cursor);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const path = `/admin/workloads/${encodeURIComponent(id)}/runs${qs ? `?${qs}` : ""}`;
  return adminFetch<{ items: WorkloadRunRecord[]; nextCursor: string | null }>(
    path,
  );
}

export async function getWorkloadRun(
  id: string,
  runId: string,
): Promise<WorkloadRunRecord> {
  const payload = await adminFetch<{ run: WorkloadRunRecord }>(
    `/admin/workloads/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}`,
  );
  return payload.run;
}

export async function getWorkloadRunLogs(
  id: string,
  runId: string,
  opts?: { tail?: number },
): Promise<{
  entries: WorkloadRunLogEntry[];
  source: "cloudLogging" | "excerpt" | "empty";
  cloudLoggingUrl?: string;
}> {
  const params = new URLSearchParams();
  if (opts?.tail) params.set("tail", String(opts.tail));
  const qs = params.toString();
  const path = `/admin/workloads/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}/logs${qs ? `?${qs}` : ""}`;
  return adminFetch<{
    entries: WorkloadRunLogEntry[];
    source: "cloudLogging" | "excerpt" | "empty";
    cloudLoggingUrl?: string;
  }>(path);
}

export async function getWorkloadRunTrace(
  rootRunId: string,
): Promise<WorkloadRunRecord[]> {
  const payload = await adminFetch<{ runs: WorkloadRunRecord[] }>(
    `/admin/workloads/runs/trace/${encodeURIComponent(rootRunId)}`,
  );
  return payload.runs;
}

// --- Platform Runtime Settings ---

export interface PlatformRuntimeSettingsResponse {
  readonly settings: {
    readonly aiEnabled: boolean | null;
    readonly aiTraceEnabled: boolean | null;
    readonly aiStepTraceEnabled: boolean | null;
    readonly requestPerfTraceEnabled: boolean | null;
    readonly seedHookObservabilityEnabled: boolean | null;
    readonly dataHookAiCacheEnabled: boolean | null;
    readonly gmailIngestDeliveryMode: "poll" | "push" | null;
    readonly updatedAt: string;
    readonly updatedBy: string;
  } | null;
  readonly effective: {
    readonly aiEnabled: boolean;
    readonly aiTraceEnabled: boolean;
    readonly aiStepTraceEnabled: boolean;
    readonly requestPerfTraceEnabled: boolean;
    readonly seedHookObservabilityEnabled: boolean;
    readonly dataHookAiCacheEnabled: boolean;
    readonly gmailIngestDeliveryMode: "poll" | "push";
  };
  readonly envDefaults: {
    readonly aiEnabled: boolean;
    readonly aiTraceEnabled: boolean;
    readonly aiStepTraceEnabled: boolean;
    readonly requestPerfTraceEnabled: boolean;
    readonly seedHookObservabilityEnabled: boolean;
    readonly dataHookAiCacheEnabled: boolean;
    readonly gmailIngestDeliveryMode: "poll" | "push";
  };
}

export async function getPlatformRuntimeSettings(): Promise<PlatformRuntimeSettingsResponse> {
  const payload = await adminFetch<
    PlatformRuntimeSettingsResponse & { ok?: boolean }
  >("/admin/platform/runtime-settings");
  return {
    settings: payload.settings,
    effective: payload.effective,
    envDefaults: payload.envDefaults,
  };
}

export async function updatePlatformRuntimeSettings(input: {
  readonly aiEnabled?: boolean | null;
  readonly aiTraceEnabled?: boolean | null;
  readonly aiStepTraceEnabled?: boolean | null;
  readonly requestPerfTraceEnabled?: boolean | null;
  readonly seedHookObservabilityEnabled?: boolean | null;
  readonly dataHookAiCacheEnabled?: boolean | null;
  readonly gmailIngestDeliveryMode?: "poll" | "push" | null;
}): Promise<PlatformRuntimeSettingsResponse> {
  const payload = await adminFetch<
    PlatformRuntimeSettingsResponse & { ok?: boolean }
  >("/admin/platform/runtime-settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return {
    settings: payload.settings,
    effective: payload.effective,
    envDefaults: payload.envDefaults,
  };
}
