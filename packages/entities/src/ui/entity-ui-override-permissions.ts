export const ENTITY_UI_OVERRIDE_PERMISSIONS = [
  "entityUiOverride.read",
  "entityUiOverride.update",
] as const;

/** Permissions that allow saving entity list view / card layout overrides. */
export const ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS = [
  "entityUiOverride.update",
  "entityDefinition.update",
  "role.update",
  "tenantUser.update",
  "hook.update",
  "entityCategory.update",
  "*.update",
] as const;

export type EntityUiOverridePermission =
  (typeof ENTITY_UI_OVERRIDE_PERMISSIONS)[number];
