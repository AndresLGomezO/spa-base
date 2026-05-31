import type {
  RbacQueryInjector,
  Filter,
  QueryContext,
} from "@repo/query-engine";
import { hasPermission } from "@repo/rbac";

interface OwnershipEntityConfig {
  readonly tenantWideRead?: boolean;
}

type OwnershipEntityConfigResolver = (
  entityName: string,
  tenantId: string,
) => OwnershipEntityConfig | undefined;

/**
 * Injects an `accessUserIds array-contains userId` filter into every
 * list query unless the user has elevated permissions (read_all or superadmin)
 * or the entity is configured for tenant-wide read.
 */
export function createOwnershipQueryInjector(
  getEntityConfig?: OwnershipEntityConfigResolver,
): RbacQueryInjector {
  return {
    injectFilters(
      entityName: string,
      context: QueryContext,
    ): readonly Filter[] {
      if (context.isSuperAdmin) {
        return [];
      }

      const config = getEntityConfig?.(entityName, context.tenantId);
      if (config?.tenantWideRead) {
        return [];
      }

      if (hasPermission(`${entityName}.read_all`, [...context.permissions])) {
        return [];
      }

      return [
        {
          field: "accessUserIds",
          operator: "array-contains" as const,
          value: context.userId,
        },
      ];
    },
  };
}
