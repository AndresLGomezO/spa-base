import { describe, expect, it, vi } from "vitest";

import {
  findUpdateMatchingLookupLeaf,
  hasUpdateMatchingLookupLeaf,
  listMatchingRecordsForWhere,
} from "./update-matching-utils.js";
import type { HookContext } from "./types.js";

describe("update matching utils", () => {
  it("finds the first == leaf with a value expression", () => {
    const leaf = findUpdateMatchingLookupLeaf({
      type: "group",
      combinator: "and",
      children: [
        {
          type: "condition",
          field: "status",
          operator: "==",
          value: { kind: "literal", value: "UPCOMING" },
        },
        {
          type: "condition",
          field: "contractId",
          operator: "==",
          value: { kind: "literal", value: "loan_1" },
        },
      ],
    });

    expect(leaf?.field).toBe("status");
  });

  it("accepts legacy typeless lookup leaves", () => {
    expect(
      hasUpdateMatchingLookupLeaf({
        field: "contractId",
        operator: "==",
        value: { kind: "literal", value: "loan_1" },
      }),
    ).toBe(true);
  });

  it("rejects trees without lookup leaves", () => {
    expect(
      hasUpdateMatchingLookupLeaf({
        type: "condition",
        field: "status",
        operator: "isEmpty",
      }),
    ).toBe(false);
  });

  it("listMatchingRecordsForWhere preserves numeric lookup values", async () => {
    const list = vi.fn(async () => [
      {
        id: "txn_1",
        tenantId: "t1",
        amount: 726300,
        reversed: false,
      },
    ]);
    const context: HookContext = {
      tenantId: "t1",
      entityName: "transaction",
      event: "financialItem.afterEmail",
      current: { id: "fi_1", __extracted: { fields: { amount: 726300 } } },
      user: { uid: "u1" },
      services: {} as HookContext["services"],
    };
    const scope = {
      current: context.current,
      now: new Date(),
      tenantId: "t1",
    };

    const matches = await listMatchingRecordsForWhere(
      "transaction",
      {
        type: "group",
        combinator: "and",
        children: [
          {
            type: "condition",
            field: "amount",
            operator: "==",
            value: {
              kind: "call",
              fn: "toNumber",
              args: [
                {
                  kind: "field",
                  source: "current",
                  path: "__extracted.fields.amount",
                },
              ],
            },
          },
          {
            type: "condition",
            field: "reversed",
            operator: "==",
            value: { kind: "literal", value: false },
          },
        ],
      },
      context,
      scope,
      list,
    );

    expect(list).toHaveBeenCalledWith("transaction", {
      field: "amount",
      value: 726300,
      limit: 500,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe("txn_1");
  });
});
