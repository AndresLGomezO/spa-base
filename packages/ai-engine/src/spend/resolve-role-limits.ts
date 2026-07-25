import type { AiSpendLimits } from "@repo/shared-types";

import { mergeStrictestAiSpendLimits } from "./limits.js";

export interface RoleAiSpendLimitsSource {
  readonly [roleName: string]: {
    readonly aiSpendLimits?: AiSpendLimits;
  };
}

export function resolveRoleAiSpendLimits(
  roleCatalog: RoleAiSpendLimitsSource | null | undefined,
  roleNames: readonly string[] | null | undefined,
): AiSpendLimits | undefined {
  if (!roleCatalog || !roleNames?.length) {
    return undefined;
  }
  const limits = roleNames.map(
    (name) => roleCatalog[name]?.aiSpendLimits ?? null,
  );
  return mergeStrictestAiSpendLimits(limits);
}
