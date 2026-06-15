import { describe, expect, it } from "vitest";
import {
  createDefaultUiLayout,
  putTenantDashboardLayoutInputSchema,
} from "@repo/entities";

import { createInMemoryTenantDashboardLayoutRepository } from "./in-memory-repository.js";

describe("tenant dashboard layout repository", () => {
  it("stores and retrieves tenant dashboard layout", async () => {
    const repository = createInMemoryTenantDashboardLayoutRepository();
    const input = putTenantDashboardLayoutInputSchema.parse({
      dashboardSections: [
        {
          id: "section-1",
          name: "Overview",
          layout: createDefaultUiLayout(["name"]),
        },
      ],
      dashboardLayout: createDefaultUiLayout(["name"]),
    });

    const saved = await repository.put("tenant-1", input);
    const loaded = await repository.get("tenant-1");

    expect(loaded).toEqual(saved);
    expect(loaded?.dashboardSections).toHaveLength(1);
  });
});
