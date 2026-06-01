import { describe, expect, it } from "vitest";

import { buildIndexFromHint } from "./firestore-index-provisioner.js";

describe("buildIndexFromHint", () => {
  it("maps array-contains filters and sort fields to composite index fields", () => {
    const index = buildIndexFromHint({
      collection: "accounts",
      tenantId: "tenant_dev_1",
      filters: [
        {
          field: "accessUserIds",
          operator: "array-contains",
          value: "user_1",
        },
      ],
      sort: { field: "id", direction: "asc" },
      suggestedFields: ["accessUserIds", "id"],
      message: "missing index",
    });

    expect(index).toEqual({
      collectionGroup: "accounts",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });
});
