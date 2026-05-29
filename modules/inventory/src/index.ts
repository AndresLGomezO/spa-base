import { defineEntity } from "@repo/entities";
import { createEntityConverter } from "@repo/firestore-converters";
import { defineModule } from "@repo/modules";

export const InventoryItem = defineEntity({
  name: "inventoryItem",
  fields: {
    name: { type: "string", required: true },
    quantity: { type: "number", required: true },
    organizationId: {
      type: "relation",
      required: true,
      relation: {
        target: "organization",
        type: "many-to-one",
        onDelete: "restrict",
      },
    },
  },
  ui: {
    nav: { label: "Inventory", icon: "folder" },
    views: [
      {
        type: "table",
        name: "default",
        fields: ["name", "quantity", "organizationId"],
        filters: [{ field: "organizationId", label: "Organization" }],
      },
    ],
    forms: {
      create: {
        sections: [{ fields: ["name", "quantity", "organizationId"] }],
      },
      edit: {
        sections: [{ fields: ["name", "quantity", "organizationId"] }],
      },
    },
    fields: {
      name: { label: "Item name", component: "input" },
      quantity: { label: "Quantity", component: "number" },
      organizationId: { label: "Organization", component: "relation" },
    },
  },
});

const inventoryItemConverter = createEntityConverter(InventoryItem);

export const inventoryModule = defineModule({
  name: "inventory",
  version: "1.0.0",
  dependencies: ["core"],
  entities: [InventoryItem],
  converters: {
    inventoryItem: inventoryItemConverter,
  },
  routes: [
    {
      method: "GET",
      path: "/api/modules/inventory/summary",
      permission: "inventoryItem.read",
      handler: async (_request, context) => ({
        module: "inventory",
        tenantId: context.tenantId,
        message: "Inventory module route is active.",
      }),
    },
  ],
  hooks: [
    {
      event: "organization.deleted",
      handler: async (hookContext) => {
        hookContext.services.logger?.info("organization.deleted hook", {
          entityName: hookContext.entityName,
          recordId: hookContext.record.id,
        });
      },
    },
  ],
  ui: {
    components: {
      badge: "BadgeField",
    },
    extend: {
      organization: {
        views: [
          {
            type: "table",
            name: "inventory-context",
            fields: ["name", "isActive"],
          },
        ],
      },
    },
  },
});

export { InventoryItem as InventoryItemEntity };
