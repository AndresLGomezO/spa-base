import type {
  RbacQueryInjector,
  Filter,
  QueryContext,
} from "@repo/query-engine";

interface OwnershipEntityConfig {
  readonly tenantWideRead?: boolean;
}

type OwnershipEntityConfigResolver = (
  entityName: string,
  tenantId: string,
) => OwnershipEntityConfig | undefined;

/**
 * Injects an `accessUserIds array-contains userId` filter into every
 * list query. The only bypass is `tenantWideRead` (per-entity config).
 * No role — including superadmin — bypasses ownership scoping.
 */
export function createOwnershipQueryInjector(
  getEntityConfig?: OwnershipEntityConfigResolver,
): RbacQueryInjector {
  return {
    injectFilters(
      entityName: string,
      context: QueryContext,
    ): readonly Filter[] {
      const config = getEntityConfig?.(entityName, context.tenantId);
      if (config?.tenantWideRead) {
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
