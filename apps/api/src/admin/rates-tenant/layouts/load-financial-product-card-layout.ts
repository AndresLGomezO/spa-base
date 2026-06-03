import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
  type ViewConfig,
} from "@repo/entities";

import { remapLayoutDocumentIds } from "./layout-seed-utils.js";

const LAYOUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "financial-product-card-layout.json",
);

export const FINANCIAL_PRODUCT_TABLE_VIEW: ViewConfig = {
  type: "table",
  name: "default",
  fields: [
    "name",
    "productTypeId",
    "categoryId",
    "currencyId",
    "initialAmount",
    "currentBalance",
    "startDate",
    "endDate",
    "statusId",
    "bankId",
    "serviceProviderId",
    "description",
  ],
};

export const FINANCIAL_PRODUCT_CARD_FIELDS = [
  "name",
  "productTypeId",
  "categoryId",
  "currencyId",
  "initialAmount",
  "currentBalance",
  "startDate",
  "endDate",
  "statusId",
  "bankId",
  "serviceProviderId",
  "description",
] as const;

let cachedLayout: UiLayoutDocument | undefined;

export function loadFinancialProductCardLayout(): UiLayoutDocument {
  if (cachedLayout) {
    return cachedLayout;
  }

  const raw = JSON.parse(readFileSync(LAYOUT_PATH, "utf8")) as unknown;
  const parsed = uiLayoutDocumentSchema.parse(raw) as UiLayoutDocument;
  cachedLayout = remapLayoutDocumentIds(parsed, "fp-card");
  return cachedLayout;
}

export function buildFinancialProductCardView(): ViewConfig {
  return {
    type: "card",
    name: "card",
    fields: [...FINANCIAL_PRODUCT_CARD_FIELDS],
    layout: loadFinancialProductCardLayout(),
  };
}
