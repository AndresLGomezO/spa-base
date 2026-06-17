import { useMemo } from "react";

import type { SemanticColorOption } from "@repo/ui-builder-react";

import { useAuth } from "../auth/AuthContext";
import { customTokenColorOptions } from "./custom-token-options";

export function useCustomTokenColorOptions(): readonly SemanticColorOption[] {
  const { tenantAppearance } = useAuth();
  return useMemo(
    () => customTokenColorOptions(tenantAppearance?.customTokens),
    [tenantAppearance?.customTokens],
  );
}
