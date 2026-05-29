import { BUILT_IN_ROLES } from "@repo/rbac";
import { createFirestoreAdminPlatformRoleRepository } from "@repo/gcp-firebase";
import type { FirebaseAdminConfig } from "@repo/gcp-firebase";

export async function seedPlatformRoles(
  firebaseAdminConfig: FirebaseAdminConfig,
): Promise<void> {
  const repository =
    createFirestoreAdminPlatformRoleRepository(firebaseAdminConfig);

  for (const [roleName, roleDefinition] of Object.entries(BUILT_IN_ROLES)) {
    await repository.ensureGlobalRole(roleName, roleDefinition.grants);
  }
}
