import type { CreateTenantRoleInput } from "@repo/rbac";

import { listLocalTenantEntityNames } from "./entity-names.js";
import type { LocalTenantConfig } from "./load-tenant-config.js";

export function buildLocalCustomRoles(
  config: LocalTenantConfig,
  entityNames: readonly string[] = listLocalTenantEntityNames(),
): readonly CreateTenantRoleInput[] {
  const businessMutations = entityNames.flatMap((name) => [
    `${name}.create`,
    `${name}.update`,
    `${name}.delete`,
  ]);
  const entityReads = entityNames.map((name) => `${name}.read`);

  return [
    {
      name: config.normalUserRole,
      description: "Edit business records for the local tenant entity model.",
      grants: [...entityReads, ...businessMutations, "customView.read"],
    },
  ];
}
