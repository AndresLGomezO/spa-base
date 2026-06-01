import { describe, expect, it } from "vitest";

import { DynamicEntityError } from "./define-entity-from-record.js";
import { assertNavCategoryExists } from "./validate-nav-category.js";

describe("assertNavCategoryExists", () => {
  it("no-ops for empty category id", async () => {
    await expect(
      assertNavCategoryExists(
        {
          getById: async () => ({ id: "cat_1" }),
        },
        "tenant_a",
        null,
      ),
    ).resolves.toBeUndefined();
  });

  it("throws when category is missing", async () => {
    await expect(
      assertNavCategoryExists(
        {
          getById: async () => null,
        },
        "tenant_a",
        "cat_missing",
      ),
    ).rejects.toBeInstanceOf(DynamicEntityError);
  });
});
