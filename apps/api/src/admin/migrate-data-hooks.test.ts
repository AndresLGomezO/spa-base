import { describe, expect, it } from "vitest";

import { convertLegacyHook } from "./migrate-data-hooks.js";

describe("convertLegacyHook", () => {
  it("maps a legacy updateField hook to a setField data hook", () => {
    const result = convertLegacyHook({
      id: "hook_1",
      tenantId: "tenant_a",
      name: "Set pending",
      entity: "loan",
      event: "loan.beforeCreate",
      type: "action",
      config: {
        actions: [{ type: "updateField", field: "status", value: "Pending" }],
      },
      enabled: true,
      order: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      id: "hook_1",
      entity: "loan",
      phase: "before",
      trigger: { operation: "create" },
      condition: null,
      order: 2,
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "Pending" },
        },
      ],
    });
  });

  it("maps createRecord and sendNotification actions", () => {
    const result = convertLegacyHook({
      id: "hook_2",
      tenantId: "tenant_a",
      name: "Follow up",
      entity: "loan",
      event: "loan.afterUpdate",
      config: {
        actions: [
          {
            type: "createRecord",
            entity: "task",
            data: { title: "Review", count: 3 },
          },
          { type: "sendNotification", message: "Updated" },
        ],
      },
      enabled: false,
      order: 0,
    });

    expect(result.phase).toBe("after");
    expect(result.trigger.operation).toBe("update");
    expect(result.enabled).toBe(false);
    expect(result.actions[0]).toEqual({
      type: "createRecord",
      entity: "task",
      data: {
        title: { kind: "literal", value: "Review" },
        count: { kind: "literal", value: 3 },
      },
    });
    expect(result.actions[1]).toEqual({
      type: "sendNotification",
      message: { kind: "literal", value: "Updated" },
    });
  });
});
