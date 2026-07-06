import { AI_PERMISSIONS } from "@repo/ai-engine/permissions";
import { DEBUG_PERMISSIONS } from "@repo/debug-logs/permissions";
import { ENTITY_CATEGORY_PERMISSIONS } from "@repo/entity-categories";
import {
  ENTITY_DEFINITION_PERMISSIONS,
  INTERNAL_ENTITY_PERMISSIONS,
  getDynamicPermissionsForTenant,
} from "@repo/dynamic-entities";
import { ENTITY_UI_OVERRIDE_PERMISSIONS } from "@repo/entities";
import { FORMULA_PERMISSIONS } from "@repo/formula-definitions/permissions";
import { HOOK_PERMISSIONS } from "@repo/hooks/permissions";
import { CHART_PERMISSIONS } from "@repo/chart-definitions/permissions";
import { ENTITY_QUERY_PERMISSIONS } from "@repo/entity-queries/permissions";
import { CUSTOM_VIEW_PERMISSIONS } from "@repo/custom-views/permissions";
import { METRIC_PERMISSIONS } from "@repo/metrics-engine/permissions";
import { getAllEntities } from "@repo/entities";

import {
  ROLE_PERMISSIONS,
  TENANT_USER_PERMISSIONS,
} from "./tenant-role-types.js";

export function getAllKnownPermissions(tenantId?: string): readonly string[] {
  const staticPermissions = getAllEntities().flatMap(
    (entity) => entity.metadata.permissions,
  );
  const permissions = [
    ...staticPermissions,
    ...ENTITY_DEFINITION_PERMISSIONS,
    ...ENTITY_UI_OVERRIDE_PERMISSIONS,
    ...ENTITY_CATEGORY_PERMISSIONS,
    ...INTERNAL_ENTITY_PERMISSIONS,
    ...HOOK_PERMISSIONS,
    ...FORMULA_PERMISSIONS,
    ...METRIC_PERMISSIONS,
    ...ENTITY_QUERY_PERMISSIONS,
    ...CHART_PERMISSIONS,
    ...CUSTOM_VIEW_PERMISSIONS,
    ...DEBUG_PERMISSIONS,
    ...AI_PERMISSIONS,
    ...ROLE_PERMISSIONS,
    ...TENANT_USER_PERMISSIONS,
    ...(tenantId ? getDynamicPermissionsForTenant(tenantId) : []),
  ];
  return [...new Set(permissions)];
}

/** @deprecated Prefer getAllKnownPermissions() after platform bootstrap. */
export const ALL_KNOWN_PERMISSIONS = getAllKnownPermissions();

export type KnownPermission = string;
