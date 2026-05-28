import type { AuthUserProjection, RegisteredUser } from "@repo/shared-types";

export interface RegisteredUserRepository {
  getByUid(uid: string): Promise<RegisteredUser | null>;
  upsertFromAuthUser(authUser: AuthUserProjection): Promise<RegisteredUser>;
}
