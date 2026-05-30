import type {
  RegisteredUserRepository,
  TenantUserInviteRepository,
} from "@repo/firestore-converters";
import type { RegisteredUser } from "@repo/shared-types";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeTenantRoles(
  user: RegisteredUser,
  tenantId: string,
  roles: readonly string[],
): RegisteredUser {
  return {
    ...user,
    tenants: {
      ...(user.tenants ?? {}),
      [tenantId]: [...roles],
    },
  };
}

export async function applyPendingUserInvites(params: {
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantUserInviteRepository: TenantUserInviteRepository;
  readonly user: RegisteredUser;
}): Promise<RegisteredUser> {
  const email = params.user.email;
  if (!email) {
    return params.user;
  }

  const invites =
    await params.tenantUserInviteRepository.listPendingForEmail(email);
  if (invites.length === 0) {
    return params.user;
  }

  let nextTenants = { ...(params.user.tenants ?? {}) };
  for (const invite of invites) {
    nextTenants = {
      ...nextTenants,
      [invite.tenantId]: [...invite.roles],
    };
    await params.tenantUserInviteRepository.delete(invite.tenantId, invite.id);
  }

  const updated = await params.registeredUserRepository.updateAccess(
    params.user.uid,
    { tenants: nextTenants },
  );
  return updated ?? { ...params.user, tenants: nextTenants };
}

export async function listTenantMembers(params: {
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantId: string;
}): Promise<
  readonly {
    readonly uid: string;
    readonly email: string | null;
    readonly displayName: string | null;
    readonly roles: readonly string[];
  }[]
> {
  const members: Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    roles: readonly string[];
  }> = [];

  let cursor: string | undefined;
  do {
    const page = await params.registeredUserRepository.list({
      limit: 100,
      cursor,
    });
    for (const user of page.items) {
      const roles = user.tenants?.[params.tenantId];
      if (!roles?.length) continue;
      members.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        roles,
      });
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  return members;
}

export async function assignTenantUserByEmail(params: {
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantUserInviteRepository: TenantUserInviteRepository;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: readonly string[];
}): Promise<
  | { readonly kind: "member"; readonly uid: string }
  | { readonly kind: "invite"; readonly id: string }
> {
  const normalized = normalizeEmail(params.email);
  const existing =
    await params.registeredUserRepository.findByEmail(normalized);

  if (existing) {
    const nextTenants = mergeTenantRoles(
      existing,
      params.tenantId,
      params.roles,
    );
    await params.registeredUserRepository.updateAccess(existing.uid, {
      tenants: nextTenants.tenants,
    });
    await params.tenantUserInviteRepository.deleteByEmail(
      params.tenantId,
      normalized,
    );
    return { kind: "member", uid: existing.uid };
  }

  const invite = await params.tenantUserInviteRepository.create(
    params.tenantId,
    { email: normalized, roles: params.roles },
  );
  return { kind: "invite", id: invite.id };
}

export async function updateTenantMemberRoles(params: {
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantId: string;
  readonly uid: string;
  readonly roles: readonly string[];
}): Promise<RegisteredUser | null> {
  const user = await params.registeredUserRepository.getByUid(params.uid);
  if (!user) return null;

  const next = mergeTenantRoles(user, params.tenantId, params.roles);
  return params.registeredUserRepository.updateAccess(params.uid, {
    tenants: next.tenants,
  });
}

export async function removeTenantMember(params: {
  readonly registeredUserRepository: RegisteredUserRepository;
  readonly tenantId: string;
  readonly uid: string;
}): Promise<RegisteredUser | null> {
  const user = await params.registeredUserRepository.getByUid(params.uid);
  if (!user) return null;

  const nextTenants = { ...(user.tenants ?? {}) };
  Reflect.deleteProperty(nextTenants, params.tenantId);

  return params.registeredUserRepository.updateAccess(params.uid, {
    tenants: nextTenants,
  });
}
