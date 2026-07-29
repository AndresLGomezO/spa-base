import { describe, expect, it } from "vitest";
import {
  defineEntity,
  registerEntity,
  type DefinedEntity,
  type FieldDefinitions,
} from "@repo/entities";

import { rewritePeriodEqualityInTree } from "./period-equality-rewrite.js";
import type { NormalizedFilterNode } from "@repo/firestore-converters/filter-tree";

type AnyDefinedEntity = DefinedEntity<string, FieldDefinitions>;

const TransactionLike = defineEntity({
  name: "txnPeriodRewrite",
  fields: {
    date: { type: "date", required: true },
    month: { type: "string" },
    year: { type: "string" },
    amount: { type: "number", required: true },
  },
});

registerEntity(TransactionLike as unknown as AnyDefinedEntity);

function cond(
  field: string,
  operator: string,
  value: unknown,
): NormalizedFilterNode {
  return {
    type: "condition",
    field,
    operator: operator as never,
    value,
  };
}

function and(children: NormalizedFilterNode[]): NormalizedFilterNode {
  return { type: "group", combinator: "and", children };
}

describe("rewritePeriodEqualityInTree", () => {
  it("rewrites calendar month range on date to month equality", () => {
    const tree = and([
      cond("date", ">=", "2026-07-01T00:00:00.000Z"),
      cond("date", "<=", "2026-07-31T23:59:59.999Z"),
    ]);

    const rewritten = rewritePeriodEqualityInTree(
      tree,
      TransactionLike as unknown as AnyDefinedEntity,
    );

    expect(rewritten).toEqual({
      type: "condition",
      field: "month",
      operator: "==",
      value: "2026-07",
    });
  });

  it("rewrites calendar year range on date to year equality", () => {
    const tree = and([
      cond("date", ">=", "2026-01-01T00:00:00.000Z"),
      cond("date", "<=", "2026-12-31T23:59:59.999Z"),
    ]);

    const rewritten = rewritePeriodEqualityInTree(
      tree,
      TransactionLike as unknown as AnyDefinedEntity,
    );

    expect(rewritten).toEqual({
      type: "condition",
      field: "year",
      operator: "==",
      value: "2026",
    });
  });

  it("leaves non-calendar-aligned ranges unchanged", () => {
    const tree = and([
      cond("date", ">=", "2026-07-01T00:00:00.000Z"),
      cond("date", "<=", "2026-07-15T23:59:59.999Z"),
    ]);

    const rewritten = rewritePeriodEqualityInTree(
      tree,
      TransactionLike as unknown as AnyDefinedEntity,
    );

    expect(rewritten).toEqual(tree);
  });

  it("preserves sibling equality filters when rewriting", () => {
    const tree = and([
      cond("date", ">=", "2026-07-01T00:00:00.000Z"),
      cond("date", "<=", "2026-07-31T23:59:59.999Z"),
      cond("type", "==", "EXPENSE"),
    ]);

    const rewritten = rewritePeriodEqualityInTree(
      tree,
      TransactionLike as unknown as AnyDefinedEntity,
    );

    expect(rewritten).toEqual(
      and([
        {
          type: "condition",
          field: "month",
          operator: "==",
          value: "2026-07",
        },
        cond("type", "==", "EXPENSE"),
      ]),
    );
  });
});
