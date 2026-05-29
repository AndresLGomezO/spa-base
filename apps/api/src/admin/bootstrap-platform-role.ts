import { PLATFORM_SUPERADMIN } from "@repo/rbac";
import type { RegisteredUser } from "@repo/shared-types";

export function parseBootstrapSuperAdminEmails(
  raw: string | undefined,
): ReadonlySet<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

export function shouldBootstrapSuperAdmin(params: {
  readonly email: string | null;
  readonly created: boolean;
  readonly platformRole: string | null | undefined;
  readonly allowlist: ReadonlySet<string>;
}): boolean {
  if (!params.created) {
    return false;
  }

  if (params.platformRole) {
    return false;
  }

  const normalizedEmail = params.email?.trim().toLowerCase() ?? "";
  if (normalizedEmail.length === 0) {
    return false;
  }

  return params.allowlist.has(normalizedEmail);
}

export function withBootstrapPlatformRole(
  user: RegisteredUser,
): RegisteredUser {
  return {
    ...user,
    platformRole: PLATFORM_SUPERADMIN,
    tenants: user.tenants ?? {},
  };
}
