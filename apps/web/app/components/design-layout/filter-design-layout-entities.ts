import { metricStripHasContent } from "@repo/entities";
import { hasPermission } from "@repo/rbac";

import type { EntityCatalogEntry } from "../../entities/entity-catalog";
import type { MetricDefinitionRecord } from "../../lib/api-client";
import { entityHasActiveMetrics } from "../../routing/entity-metrics-nav";
import type { DesignLayoutEntityKind } from "./design-layout-kind";

export function filterDesignLayoutEntities(
  kind: DesignLayoutEntityKind,
  entityItems: readonly EntityCatalogEntry[],
  permissions: readonly string[],
  isSuperAdmin: boolean,
  metricDefinitions: readonly MetricDefinitionRecord[] = [],
): readonly EntityCatalogEntry[] {
  if (
    !hasPermission("entityUiOverride.read", permissions, {
      isSuperAdmin,
    })
  ) {
    return [];
  }

  return entityItems.filter((definition) => {
    if (
      !hasPermission(`${definition.name}.read`, permissions, {
        isSuperAdmin,
      })
    ) {
      return false;
    }

    if (kind !== "metrics") {
      return true;
    }

    return entityHasActiveMetrics(
      definition.name,
      metricDefinitions,
      metricStripHasContent(definition.ui.metricRowLayout),
    );
  });
}
