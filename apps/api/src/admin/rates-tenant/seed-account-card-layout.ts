import { createAccountCardSeedLayout, type ViewConfig } from "@repo/entities";
import type { EntityUiOverrideRepository } from "@repo/firestore-converters";

import { RATES_TENANT_ID } from "./constants.js";

const accountTableView: ViewConfig = {
  type: "table",
  name: "default",
  fields: [
    "name",
    "accountTypeId",
    "currencyId",
    "bankId",
    "balance",
    "createdAt",
    "updatedAt",
  ],
};

const accountCardView: ViewConfig = {
  type: "card",
  name: "card",
  fields: [
    "name",
    "accountTypeId",
    "currencyId",
    "bankId",
    "balance",
    "createdAt",
    "updatedAt",
  ],
  layout: createAccountCardSeedLayout(),
};

export async function seedRatesAccountCardLayout(
  repository: EntityUiOverrideRepository,
): Promise<void> {
  await repository.put(RATES_TENANT_ID, "account", {
    views: [accountTableView, accountCardView],
    listViewType: "table",
  });
}
