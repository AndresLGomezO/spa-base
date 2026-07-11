import { describe, expect, it } from "vitest";
import {
  createDefaultUiLayout,
  createEmptyScreenLayout,
  putTenantSidebarLayoutInputSchema,
} from "@repo/entities";

import { createInMemoryTenantSidebarLayoutRepository } from "./in-memory-repository.js";

describe("tenant sidebar layout repository", () => {
  it("stores and retrieves tenant sidebar layout", async () => {
    const repository = createInMemoryTenantSidebarLayoutRepository();
    const input = putTenantSidebarLayoutInputSchema.parse({
      sidebarLayout: createDefaultUiLayout(["name"]),
      headerLayout: createEmptyScreenLayout(),
      footerLayout: createEmptyScreenLayout(),
      settings: {
        autoCollapseBreakpoint: "sm",
        hamburgerBreakpoint: "md",
      },
    });

    const saved = await repository.put("tenant-1", input);
    const loaded = await repository.get("tenant-1");

    expect(loaded).toEqual(saved);
    expect(loaded?.settings.hamburgerBreakpoint).toBe("md");
    expect(loaded?.headerLayout.root.type).toBe("screen-root");
    expect(loaded?.footerLayout.root.type).toBe("screen-root");
  });

  it("returns null when no layout exists", async () => {
    const repository = createInMemoryTenantSidebarLayoutRepository();
    expect(await repository.get("missing")).toBeNull();
  });

  it("deletes an existing tenant sidebar layout", async () => {
    const repository = createInMemoryTenantSidebarLayoutRepository();
    const input = putTenantSidebarLayoutInputSchema.parse({
      sidebarLayout: createDefaultUiLayout(["name"]),
      headerLayout: createEmptyScreenLayout(),
      footerLayout: createEmptyScreenLayout(),
      settings: {
        autoCollapseBreakpoint: null,
        hamburgerBreakpoint: "md",
      },
    });

    await repository.put("tenant-1", input);
    expect(await repository.delete("tenant-1")).toBe(true);
    expect(await repository.get("tenant-1")).toBeNull();
    expect(await repository.delete("tenant-1")).toBe(false);
  });
});
