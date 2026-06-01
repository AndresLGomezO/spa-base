import { describe, expect, it } from "vitest";

import { canIncludeEntityInCatalog } from "./catalog-visibility.js";

describe("canIncludeEntityInCatalog", () => {
  it("includes entities that are not hidden from nav", () => {
    expect(canIncludeEntityInCatalog(false, [], false)).toBe(true);
    expect(canIncludeEntityInCatalog(undefined, [], false)).toBe(true);
  });

  it("excludes hidden entities for regular users", () => {
    expect(canIncludeEntityInCatalog(true, ["lookup.read"], false)).toBe(false);
  });

  it("includes hidden entities for superadmin", () => {
    expect(canIncludeEntityInCatalog(true, [], true)).toBe(true);
  });

  it("includes hidden entities for internalEntity.read", () => {
    expect(
      canIncludeEntityInCatalog(true, ["internalEntity.read"], false),
    ).toBe(true);
  });

  it("does not include hidden entities for entityDefinition.read alone", () => {
    expect(
      canIncludeEntityInCatalog(true, ["entityDefinition.read"], false),
    ).toBe(false);
  });
});
