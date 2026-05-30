import { defineEntity, registerEntity } from "@repo/entities";
import { clearModuleRegistries } from "@repo/modules";

import { platformApp } from "@app/platform/app.config.js";
import {
  bootstrapPlatformApp,
  resetPlatformBootstrapForTests,
} from "@app/platform/bootstrap.js";

const WidgetEntity = defineEntity({
  name: "widget",
  fields: {
    name: { type: "string", required: true },
    email: { type: "string" },
    isActive: { type: "boolean", default: true },
  },
  ui: {
    nav: { label: "Widgets", icon: "box" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "email", "isActive"],
      },
    ],
    forms: {
      create: {
        sections: [{ fields: ["name", "email", "isActive"] }],
      },
      edit: {
        sections: [{ fields: ["name", "email", "isActive"] }],
      },
    },
  },
});

const TestItemEntity = defineEntity({
  name: "testItem",
  fields: {
    name: { type: "string", required: true },
    budget: { type: "number", required: true },
    widgetId: {
      type: "relation",
      required: true,
      relation: {
        target: "widget",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
    isCompleted: { type: "boolean", default: false },
  },
});

export function registerCrudTestEntities(): void {
  resetPlatformBootstrapForTests();
  clearModuleRegistries();
  bootstrapPlatformApp(platformApp);
  registerEntity(WidgetEntity);
  registerEntity(TestItemEntity);
}
