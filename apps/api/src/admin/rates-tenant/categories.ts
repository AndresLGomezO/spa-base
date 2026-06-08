import type { CreateEntityCategoryInput } from "@repo/entity-categories";

import { RATES_CATEGORY_NAMES } from "./constants.js";

export const RATES_ENTITY_CATEGORIES: readonly CreateEntityCategoryInput[] = [
  {
    name: RATES_CATEGORY_NAMES.contracts,
    icon: "FileText",
    order: 1,
  },
];
