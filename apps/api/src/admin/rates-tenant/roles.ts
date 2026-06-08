import type { CreateTenantRoleInput } from "@repo/rbac";

import {
  RATES_BUSINESS_ENTITY_NAMES,
  RATES_ENTITY_NAMES,
} from "./definitions/index.js";

const BUSINESS_MUTATIONS = RATES_BUSINESS_ENTITY_NAMES.flatMap((name) => [
  `${name}.create`,
  `${name}.update`,
  `${name}.delete`,
]);

/** Explicit entity reads — avoids `*.read`, which expands to `internalEntity.read` and exposes hidden nav items. */
const ENTITY_READS = RATES_ENTITY_NAMES.map((name) => `${name}.read`);

const NORMAL_RATES_USER_ROLE: CreateTenantRoleInput = {
  name: "normalRatesUser",
  description:
    "Edit contracts, accounts, transactions, and related records across the Rates contract model.",
  grants: [...ENTITY_READS, ...BUSINESS_MUTATIONS, "*"],
};

export function buildRatesCustomRoles(): readonly CreateTenantRoleInput[] {
  return [NORMAL_RATES_USER_ROLE];
}
