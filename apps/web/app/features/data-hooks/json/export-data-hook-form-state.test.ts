import { describe, expect, it } from "vitest";

import {
  exportDataHookFormState,
  importDataHookFormState,
} from "./export-data-hook-form-state";

describe("export-data-hook-form-state", () => {
  it("exports portable hook definition without server fields", () => {
    const portable = exportDataHookFormState({
      name: "Set status",
      description: "Sets pending on create",
      entity: "loan",
      phase: "before",
      trigger: { kind: "crud", operation: "create" },
      condition: null,
      actions: [
        {
          type: "setField",
          field: "status",
          value: { kind: "literal", value: "Pending" },
        },
      ],
      enabled: true,
      order: 0,
      chainHooks: false,
      execution: "sync",
    });

    expect(portable).not.toHaveProperty("id");
    expect(portable).not.toHaveProperty("tenantId");
    expect(portable.name).toBe("Set status");
    expect(portable.description).toBe("Sets pending on create");
    expect(portable.entity).toBe("loan");
  });

  it("round-trips editor form state", () => {
    const exported = exportDataHookFormState({
      name: "Notify on update",
      entity: "loan",
      phase: "after",
      trigger: { kind: "crud", operation: "update", updateFields: ["status"] },
      condition: null,
      actions: [
        {
          type: "sendNotification",
          message: { kind: "literal", value: "Updated" },
        },
      ],
      enabled: false,
      order: 2,
      chainHooks: true,
      execution: "queued",
    });

    const imported = importDataHookFormState(exported);
    expect(imported.phase).toBe("after");
    expect(imported.enabled).toBe(false);
    expect(imported.order).toBe(2);
    expect(imported.chainHooks).toBe(true);
    expect(imported.execution).toBe("queued");
    expect(imported.trigger).toEqual({
      kind: "crud",
      operation: "update",
      updateFields: ["status"],
    });
  });
});
