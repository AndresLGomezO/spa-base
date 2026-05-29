import type { PlatformRole } from "@repo/shared-types";

export interface PlatformRoleRepository {
  listGlobal(): Promise<readonly PlatformRole[]>;
  getByName(name: string): Promise<PlatformRole | null>;
  ensureGlobalRole(name: string, grants: readonly string[]): Promise<void>;
}
