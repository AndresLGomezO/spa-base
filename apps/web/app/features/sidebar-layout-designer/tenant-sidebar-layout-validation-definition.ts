import type { SerializableEntityDefinition } from "@repo/entities";
import { createDefaultFormLayout } from "@repo/ui-builder-core";

export const TENANT_SIDEBAR_LAYOUT_PRESET_SOURCE = "tenant-sidebar";

const defaultFormLayout = createDefaultFormLayout(["name"]);

export const TENANT_SIDEBAR_LAYOUT_VALIDATION_DEFINITION = {
  name: TENANT_SIDEBAR_LAYOUT_PRESET_SOURCE,
  collection: "tenant_sidebar_layouts",
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
