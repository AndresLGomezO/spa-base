import type {
  AuthUserProjection,
  RegisteredUser,
  UserRole,
} from "@repo/shared-types";

export interface UpsertRegisteredUserOptions {
  readonly initialRole?: UserRole;
}

export interface RegisteredUserRepository {
  getByUid(uid: string): Promise<RegisteredUser | null>;
  upsertFromAuthUser(
    authUser: AuthUserProjection,
    options?: UpsertRegisteredUserOptions,
  ): Promise<RegisteredUser>;
  updateRole(uid: string, role: UserRole): Promise<RegisteredUser>;
  markClaimsSynced(uid: string, syncedAtIso: string): Promise<RegisteredUser>;
}
