import { getAppCheckHeaderValue } from "./app-check";
import { appConfig } from "../config/app-config";
import { auth } from "./firebase";

interface AdminRole {
  readonly name: string;
  readonly grants: readonly string[];
}

interface AdminUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly platformRole: string | null;
  readonly tenants: Readonly<Record<string, readonly string[]>>;
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

export async function listAdminRoles(): Promise<readonly AdminRole[]> {
  const payload = await adminFetch<{ roles: AdminRole[] }>("/admin/roles");
  return payload.roles;
}

export async function listAdminTenants(): Promise<readonly string[]> {
  const payload = await adminFetch<{ tenants: string[] }>("/admin/tenants");
  return payload.tenants;
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

export type { AdminUser };
