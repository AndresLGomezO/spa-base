import {
  uiLayoutDocumentSchema,
  type UiLayoutDocument,
  type ViewConfig,
} from "@repo/entities";

import financialProductCardLayoutJson from "./financial-product-card-layout.json" with { type: "json" };

import { remapLayoutDocumentIds } from "./layout-seed-utils.js";

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

const FINANCIAL_PRODUCT_CARD_FIELDS = [
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

  const parsed = uiLayoutDocumentSchema.parse(
    financialProductCardLayoutJson,
  ) as UiLayoutDocument;
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
