import { describe, expect, it } from "vitest";

import { assertFinancialProductUiOverrideValid } from "./seed-financial-product-card-layout.js";
import {
  buildFinancialProductCardView,
  loadFinancialProductCardLayout,
} from "./layouts/load-financial-product-card-layout.js";

const NAV_CATEGORY_IDS = {
  referenceData: "cat_ref",
  portfolio: "cat_port",
  transactions: "cat_tx",
  extensions: "cat_ext",
} as const;

describe("seedRatesFinancialProductCardLayout", () => {
  it("validates card layout field paths against the financialProduct definition", () => {
    expect(() =>
      assertFinancialProductUiOverrideValid(NAV_CATEGORY_IDS),
    ).not.toThrow();
  });

  it("uses deterministic layout ids after load", () => {
    const first = loadFinancialProductCardLayout();
    const second = loadFinancialProductCardLayout();
    expect(first.root.id).toBe("fp-card-root-0");
    expect(second.root.id).toBe(first.root.id);
  });

  it("includes description in card view fields", () => {
    const cardView = buildFinancialProductCardView();
    expect(cardView.fields).toContain("description");
  });

  it("ships the demo card layout with relation aliases and description", () => {
    const layoutJson = JSON.stringify(loadFinancialProductCardLayout());
    expect(layoutJson).toContain("bank.logo");
    expect(layoutJson).toContain("productType.name");
    expect(layoutJson).toContain('"path":"description"');
    expect(layoutJson).toContain('"cardsPerRow":2');
  });
});
