import { getAppCheckHeaderValue } from "./app-check";
import { appConfig } from "../config/app-config";
import { auth } from "./firebase";

interface AdminUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly platformRole: string | null;
  readonly tenants: Readonly<Record<string, readonly string[]>>;
}

interface AdminTenant {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "suspended";
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
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

export async function listAdminTenants(): Promise<readonly AdminTenant[]> {
  const payload = await adminFetch<{ tenants: AdminTenant[] }>(
    "/admin/tenants",
  );
  return payload.tenants;
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

export async function listAdminUsers(): Promise<readonly AdminUser[]> {
  const payload = await adminFetch<{ items: AdminUser[] }>("/admin/users");
  return payload.items;
}

export async function updateAdminUserAccess(
  uid: string,
  tenants: Record<string, string[]>,
): Promise<AdminUser> {
  const payload = await adminFetch<{ user: AdminUser }>(
    `/admin/users/${encodeURIComponent(uid)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ tenants }),
    },
  );

  return payload.user;
}

export type { AdminTenant, AdminUser };
