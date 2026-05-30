import type { TenantAppearance } from "@repo/shared-types";

import type { User } from "./firebase";
import { getAppCheckHeaderValue } from "./app-check";
import { appConfig } from "../config/app-config";

import type { TenantOption } from "../auth/auth.types";

interface SyncedAuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantId: string | null;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly tenantRoleNames: readonly string[];
  readonly activeTenantName: string | null;
  readonly tenantAppearance: TenantAppearance | null;
}

interface SyncAuthSessionResult {
  readonly ok: boolean;
  readonly user?: SyncedAuthUser;
  readonly error?: string;
}

interface SelectTenantSessionResult {
  readonly ok: boolean;
  readonly tenantId?: string;
  readonly availableTenants?: readonly string[];
  readonly tenantOptions?: readonly TenantOption[];
  readonly permissions?: readonly string[];
  readonly isSuperAdmin?: boolean;
  readonly error?: string;
  readonly tenantRoleNames?: readonly string[];
  readonly activeTenantName?: string | null;
  readonly tenantAppearance?: TenantAppearance | null;
}

interface AuthValidateSuccessResponse {
  readonly ok: true;
  readonly user: {
    readonly uid: string;
    readonly email: string | null;
    readonly permissions?: readonly string[];
    readonly isSuperAdmin?: boolean;
    readonly tenantId?: string | null;
    readonly availableTenants?: readonly string[];
    readonly tenantOptions?: readonly TenantOption[];
    readonly tenantRoleNames?: readonly string[];
    readonly activeTenantName?: string | null;
    readonly tenantAppearance?: TenantAppearance | null;
  };
}

interface AuthValidateErrorResponse {
  readonly ok: false;
  readonly message?: string;
}

interface AuthSelectTenantSuccessResponse {
  readonly ok: true;
  readonly tenantId: string;
  readonly availableTenants: readonly string[];
  readonly tenantOptions: readonly TenantOption[];
  readonly permissions: readonly string[];
  readonly isSuperAdmin: boolean;
  readonly tenantRoleNames: readonly string[];
  readonly activeTenantName: string | null;
  readonly tenantAppearance: TenantAppearance | null;
}

interface AuthSelectTenantErrorResponse {
  readonly ok: false;
  readonly message?: string;
}

async function getAuthRequestHeaders(firebaseUser: User) {
  const [idToken, appCheckToken] = await Promise.all([
    firebaseUser.getIdToken(),
    getAppCheckHeaderValue(),
  ]);

  return {
    Authorization: `Bearer ${idToken}`,
    "X-Firebase-AppCheck": appCheckToken,
  };
}

function mapValidateUser(
  user: AuthValidateSuccessResponse["user"],
): SyncedAuthUser {
  return {
    uid: user.uid,
    email: user.email,
    permissions: user.permissions ?? [],
    isSuperAdmin: user.isSuperAdmin ?? false,
    tenantId: user.tenantId ?? null,
    availableTenants: user.availableTenants ?? [],
    tenantOptions: user.tenantOptions ?? [],
    tenantRoleNames: user.tenantRoleNames ?? [],
    activeTenantName: user.activeTenantName ?? null,
    tenantAppearance: user.tenantAppearance ?? null,
  };
}

export async function syncAuthSession(
  firebaseUser: User,
): Promise<SyncAuthSessionResult> {
  try {
    const headers = await getAuthRequestHeaders(firebaseUser);

    const response = await fetch(
      new URL("/auth/validate", appConfig.apiBaseUrl),
      {
        method: "GET",
        headers,
      },
    );

    const payload = (await response.json()) as
      | AuthValidateSuccessResponse
      | AuthValidateErrorResponse;

    if (!response.ok || !payload.ok) {
      const message =
        "message" in payload && payload.message
          ? payload.message
          : "Session validation failed.";
      return { ok: false, error: message };
    }

    return {
      ok: true,
      user: mapValidateUser(payload.user),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to register session with the server.";
    return { ok: false, error: message };
  }
}

export async function selectTenantSession(
  firebaseUser: User,
  tenantId: string,
): Promise<SelectTenantSessionResult> {
  try {
    const headers = await getAuthRequestHeaders(firebaseUser);

    const response = await fetch(
      new URL("/auth/select-tenant", appConfig.apiBaseUrl),
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tenantId }),
      },
    );

    const payload = (await response.json()) as
      | AuthSelectTenantSuccessResponse
      | AuthSelectTenantErrorResponse;

    if (!response.ok || !payload.ok) {
      const message =
        "message" in payload && payload.message
          ? payload.message
          : "Unable to select tenant.";
      return { ok: false, error: message };
    }

    return {
      ok: true,
      tenantId: payload.tenantId,
      availableTenants: payload.availableTenants,
      tenantOptions: payload.tenantOptions,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin,
      tenantRoleNames: payload.tenantRoleNames ?? [],
      activeTenantName: payload.activeTenantName ?? null,
      tenantAppearance: payload.tenantAppearance ?? null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to select tenant with the server.";
    return { ok: false, error: message };
  }
}
