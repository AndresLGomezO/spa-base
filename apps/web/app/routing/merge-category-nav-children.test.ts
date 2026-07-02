import { Database } from "lucide-react";
import { describe, expect, it } from "vitest";

import type { CustomViewNavItem } from "../custom-views/use-custom-view-nav-items";
import type { EntityNavItem } from "../entities/use-entity-nav-items";
import { mergeCategoryNavChildren } from "./merge-category-nav-children.js";

const icon = Database;

function entity(id: string, navCategoryId?: string): EntityNavItem {
  return {
    id,
    label: id,
    to: `/app/${id}`,
    matchPath: `/app/${id}`,
    icon,
    ...(navCategoryId ? { navCategoryId } : {}),
  };
}

function customView(
  viewId: string,
  sourceEntity: string,
  navCategoryId?: string,
): CustomViewNavItem {
  return {
    id: viewId,
    label: viewId,
    to: `/app/views/${viewId}`,
    matchPath: `/app/views/${viewId}`,
    icon,
    sourceEntity,
    ...(navCategoryId ? { navCategoryId } : {}),
  };
}

describe("mergeCategoryNavChildren", () => {
  it("prefers custom views over raw entity links for the same source entity", () => {
    const children = mergeCategoryNavChildren(
      "cat_movements",
      [
        entity("transaction", "cat_movements"),
        entity("actor", "cat_movements"),
      ],
      [
        customView("transactions-this-month", "transaction", "cat_movements"),
        customView("income-this-month", "transaction", "cat_movements"),
      ],
    );

    expect(children.map((child) => child.id)).toEqual([
      "actor",
      "income-this-month",
      "transactions-this-month",
    ]);
  });

  it("keeps entity link when no custom view covers that entity in the category", () => {
    const children = mergeCategoryNavChildren(
      "cat_my_money",
      [entity("account", "cat_my_money"), entity("actor", "cat_my_money")],
      [customView("accounts-by-balance", "account", "cat_my_money")],
    );

    expect(children.map((child) => child.id)).toEqual([
      "accounts-by-balance",
      "actor",
    ]);
  });
});
