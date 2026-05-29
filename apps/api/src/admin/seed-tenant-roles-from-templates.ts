import { BUILT_IN_ROLES } from "@repo/rbac";
import {
  createFirestoreAdminPlatformRoleRepository,
  createFirestoreAdminTenantRoleRepository,
  type FirebaseAdminConfig,
} from "@repo/gcp-firebase";

export async function seedTenantRolesFromTemplates(
  firebaseAdminConfig: FirebaseAdminConfig,
  tenantId: string,
): Promise<void> {
  const platformRoleRepository =
    createFirestoreAdminPlatformRoleRepository(firebaseAdminConfig);
  const tenantRoleRepository =
    createFirestoreAdminTenantRoleRepository(firebaseAdminConfig);

  const globalTemplates = await platformRoleRepository.listGlobal();

  for (const template of globalTemplates) {
    await tenantRoleRepository.ensureFromTemplate(tenantId, {
      name: template.name,
      grants: template.grants,
    });
  }

  for (const [name, definition] of Object.entries(BUILT_IN_ROLES)) {
    const hasTemplate = globalTemplates.some((role) => role.name === name);
    if (hasTemplate) {
      continue;
    }

    await tenantRoleRepository.ensureFromTemplate(tenantId, {
      name,
      grants: definition.grants,
    });
  }
}
