import type { SerializableEntityDefinition } from "@repo/entities";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

export const TENANT_DASHBOARD_LAYOUT_PRESET_SOURCE = "tenant-dashboard";

const defaultFormLayout = createDefaultFormLayout(["name"]);

export const TENANT_DASHBOARD_LAYOUT_VALIDATION_DEFINITION = {
  name: TENANT_DASHBOARD_LAYOUT_PRESET_SOURCE,
  collection: "tenant_dashboard_layouts",
  permissions: [],
  fields: {
    name: { type: "string", required: true, optional: false },
  },
  ui: {
    views: [],
    forms: {
      create: { layout: defaultFormLayout },
      edit: { layout: defaultFormLayout },
    },
  },
} satisfies SerializableEntityDefinition;
