import type { TenantAppearance } from "@repo/shared-types";

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

export type { AdminTenant };
