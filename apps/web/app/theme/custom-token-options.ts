import type { TenantCustomToken } from "@repo/shared-types";
import { buildCustomTokenColorOptions } from "@repo/theme/tenant-overrides";
import type { SemanticColorOption } from "@repo/ui-builder-react";

export function customTokenColorOptions(
  tokens: readonly TenantCustomToken[] | undefined,
): readonly SemanticColorOption[] {
  return buildCustomTokenColorOptions(tokens);
}
