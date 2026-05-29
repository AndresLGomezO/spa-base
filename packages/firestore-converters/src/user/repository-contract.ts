import type { AuthUserProjection, RegisteredUser } from "@repo/shared-types";

export interface RegisteredUserUpsertResult {
  readonly user: RegisteredUser;
  readonly created: boolean;
}

export interface RegisteredUserListParams {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface RegisteredUserListResult {
  readonly items: readonly RegisteredUser[];
  readonly nextCursor: string | null;
}

export interface UpdateRegisteredUserAccessInput {
  readonly platformRole?: string | null;
  readonly tenants?: Readonly<Record<string, readonly string[]>>;
}

export interface RegisteredUserRepository {
  getByUid(uid: string): Promise<RegisteredUser | null>;
  upsertFromAuthUser(
    authUser: AuthUserProjection,
  ): Promise<RegisteredUserUpsertResult>;
  list(params?: RegisteredUserListParams): Promise<RegisteredUserListResult>;
  updateAccess(
    uid: string,
    data: UpdateRegisteredUserAccessInput,
  ): Promise<RegisteredUser | null>;
}
