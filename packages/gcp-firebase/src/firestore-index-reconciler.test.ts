import { describe, expect, it } from "vitest";

import {
  computeIndexSignature,
  buildOwnershipFkIndex,
} from "@repo/firestore-indexes";

import {
  adminIndexToComposite,
  pickIndexesToDelete,
} from "./firestore-index-reconciler.js";

describe("adminIndexToComposite", () => {
  it("maps composite admin indexes with array-contains", () => {
    const composite = adminIndexToComposite("orders", {
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });

    expect(composite).toEqual({
      collectionGroup: "orders",
      queryScope: "COLLECTION",
      fields: [
        { fieldPath: "accessUserIds", arrayConfig: "CONTAINS" },
        { fieldPath: "id", order: "ASCENDING" },
      ],
    });
  });

  it("returns null for single-field indexes", () => {
    expect(
      adminIndexToComposite("orders", {
        fields: [{ fieldPath: "id", order: "ASCENDING" }],
      }),
    ).toBeNull();
  });
});

describe("pickIndexesToDelete", () => {
  it("does not delete when another tenant still needs the signature", () => {
    const fkIndex = buildOwnershipFkIndex("orders", "customerId");
    const signature = computeIndexSignature(fkIndex);
    const globalDesired = new Set([signature]);

    expect(pickIndexesToDelete([fkIndex], globalDesired)).toEqual([]);
  });

  it("deletes when signature is unused globally", () => {
    const fkIndex = buildOwnershipFkIndex("orders", "customerId");
    const globalDesired = new Set<string>();

    expect(pickIndexesToDelete([fkIndex], globalDesired)).toEqual([fkIndex]);
  });
});
