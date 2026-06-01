import type { CreateEntityCategoryInput } from "@repo/entity-categories";

import { RATES_CATEGORY_NAMES } from "./constants.js";

export const RATES_ENTITY_CATEGORIES: readonly CreateEntityCategoryInput[] = [
  { name: RATES_CATEGORY_NAMES.portfolio, icon: "Wallet", order: 1 },
  { name: RATES_CATEGORY_NAMES.transactions, icon: "ArrowLeftRight", order: 2 },
  { name: RATES_CATEGORY_NAMES.extensions, icon: "Puzzle", order: 3 },
  { name: RATES_CATEGORY_NAMES.referenceData, icon: "Settings", order: 4 },
];
