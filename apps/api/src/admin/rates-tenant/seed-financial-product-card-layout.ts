import {
  defineEntityFromRecord,
  type CreateEntityDefinitionInput,
} from "@repo/dynamic-entities";
import { validateEntityUIConfig, type ViewConfig } from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { RATES_TENANT_ID } from "./constants.js";
import {
  buildFinancialProductCardView,
  FINANCIAL_PRODUCT_TABLE_VIEW,
} from "./layouts/load-financial-product-card-layout.js";
import { buildRatesEntityDefinitions } from "./definitions/index.js";
import type { RatesNavCategoryIds } from "./definitions/index.js";

const FINANCIAL_PRODUCT_VIEWS: readonly ViewConfig[] = [
  FINANCIAL_PRODUCT_TABLE_VIEW,
  buildFinancialProductCardView(),
];

function ratesDefinitionForValidation(definition: CreateEntityDefinitionInput) {
  const timestamp = "1970-01-01T00:00:00.000Z";
  return defineEntityFromRecord({
    id: `rates-seed-${definition.name}`,
    tenantId: RATES_TENANT_ID,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...definition,
  });
}

export function assertFinancialProductUiOverrideValid(
  navCategoryIds: RatesNavCategoryIds,
): void {
  const definitions = buildRatesEntityDefinitions(navCategoryIds);
  const financialProductDefinition = definitions.find(
    (definition) => definition.name === "financialProduct",
  );
  if (!financialProductDefinition) {
    throw new Error("Rates seed: financialProduct definition is missing.");
  }

  const financialProduct = ratesDefinitionForValidation(
    financialProductDefinition,
  );
  const baseUi = financialProduct.metadata.ui;
  if (!baseUi) {
    throw new Error("Rates seed: financialProduct UI metadata is missing.");
  }

  validateEntityUIConfig(financialProduct, {
    ...baseUi,
    views: [...FINANCIAL_PRODUCT_VIEWS],
    listViewType: "card",
  });
}

export async function seedRatesFinancialProductCardLayout(
  repository: EntityUiOverrideRepository,
  navCategoryIds: RatesNavCategoryIds,
): Promise<void> {
  assertFinancialProductUiOverrideValid(navCategoryIds);

  await repository.put(RATES_TENANT_ID, "financialProduct", {
    views: [...FINANCIAL_PRODUCT_VIEWS],
    listViewType: "card",
  });
}
