import { describe, expect, it } from "vitest";
import { Database, Folder } from "lucide-react";

import { resolveLucideIcon } from "./resolve-lucide-icon";

describe("resolveLucideIcon", () => {
  it("resolves known icon names", () => {
    expect(resolveLucideIcon("Folder")).toBe(Folder);
  });

  it("falls back to Database for unknown names", () => {
    expect(resolveLucideIcon("NotARealLucideIconName")).toBe(Database);
  });
});
