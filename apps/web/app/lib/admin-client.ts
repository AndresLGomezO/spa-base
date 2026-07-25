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

export interface PlatformRuntimeSettingsResponse {
  readonly settings: {
    readonly aiEnabled: boolean | null;
    readonly aiTraceEnabled: boolean | null;
    readonly aiStepTraceEnabled: boolean | null;
    readonly requestPerfTraceEnabled: boolean | null;
    readonly seedHookObservabilityEnabled: boolean | null;
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
    readonly gmailIngestDeliveryMode: "poll" | "push";
  };
  readonly envDefaults: {
    readonly aiEnabled: boolean;
    readonly aiTraceEnabled: boolean;
    readonly aiStepTraceEnabled: boolean;
    readonly requestPerfTraceEnabled: boolean;
    readonly seedHookObservabilityEnabled: boolean;
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
