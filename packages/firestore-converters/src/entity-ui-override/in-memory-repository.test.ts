import { createDefaultUiLayout } from "@repo/entities";
import { describe, expect, it } from "vitest";

import { createInMemoryEntityUiOverrideRepository } from "./in-memory-repository.js";

describe("createInMemoryEntityUiOverrideRepository", () => {
  it("persists and restores metricWidgets on put/get", async () => {
    const repository = createInMemoryEntityUiOverrideRepository();
    const widgetLayout = createDefaultUiLayout(["name"]);
    const metricWidgets = [
      {
        id: "widget-1",
        name: "Widget 1",
        layout: widgetLayout,
      },
    ];

    const saved = await repository.put("tenant_a", "account", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      metricWidgets,
    });

    expect(saved.metricWidgets).toEqual(metricWidgets);

    const loaded = await repository.get("tenant_a", "account");
    expect(loaded?.metricWidgets).toEqual(metricWidgets);
  });

  it("persists an empty metricWidgets array", async () => {
    const repository = createInMemoryEntityUiOverrideRepository();

    const saved = await repository.put("tenant_a", "account", {
      views: [{ type: "table", name: "default", fields: ["name"] }],
      metricWidgets: [],
    });

    expect(saved.metricWidgets).toEqual([]);

    const loaded = await repository.get("tenant_a", "account");
    expect(loaded?.metricWidgets).toEqual([]);
  });
});
