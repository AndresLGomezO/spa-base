import { hasPermission } from "@repo/rbac";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAuth } from "../../auth/AuthContext";
import { getEntityLabel, type EntityName } from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { listMetricDefinitions } from "../../lib/api-client";
import { filterDesignLayoutEntities } from "./filter-design-layout-entities";
import type { DesignLayoutEntityKind } from "./design-layout-kind";

export interface DesignLayoutEntityOption {
  readonly value: EntityName;
  readonly label: string;
}

function compareEntityLabels(left: string, right: string): number {
  return left.localeCompare(right);
}

export function useDesignLayoutEntityOptions(kind: DesignLayoutEntityKind) {
  const { permissions, isSuperAdmin, tenantId } = useAuth();
  const { items: entityItems, isLoading: isCatalogLoading } =
    useEntityCatalog();

  const canAccessDesignLayout = hasPermission(
    "entityUiOverride.read",
    permissions,
    {
      isSuperAdmin,
    },
  );

  const canListMetricDefinitions = hasPermission(
    "metricDefinition.read",
    permissions,
    { isSuperAdmin },
  );

  const metricDefinitionsQuery = useQuery({
    queryKey: ["metric-definitions", "design-layout-entity-options", tenantId],
    queryFn: async () => {
      const result = await listMetricDefinitions();
      return result.items;
    },
    enabled:
      kind === "metrics" &&
      canListMetricDefinitions &&
      Boolean(tenantId) &&
      canAccessDesignLayout,
    staleTime: 30_000,
  });

  const options = useMemo((): readonly DesignLayoutEntityOption[] => {
    const filtered = filterDesignLayoutEntities(
      kind,
      entityItems,
      permissions,
      isSuperAdmin,
      metricDefinitionsQuery.data ?? [],
    );

    return filtered
      .map((definition) => ({
        value: definition.name as EntityName,
        label: getEntityLabel(definition),
      }))
      .sort((left, right) => compareEntityLabels(left.label, right.label));
  }, [
    entityItems,
    kind,
    metricDefinitionsQuery.data,
    permissions,
    isSuperAdmin,
  ]);

  const defaultEntity = options[0]?.value ?? null;

  const isLoading =
    isCatalogLoading ||
    (kind === "metrics" &&
      canAccessDesignLayout &&
      metricDefinitionsQuery.isLoading);

  return {
    options,
    defaultEntity,
    isLoading,
    canAccessDesignLayout,
  };
}
