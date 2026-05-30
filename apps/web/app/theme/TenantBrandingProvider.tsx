import type { TenantAppearance } from "@repo/shared-types";
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";
import { useColorScheme } from "@repo/theme/react";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";

const APPLIED_VARS = new Set<string>();

function clearAppliedVars(root: HTMLElement) {
  for (const cssVar of APPLIED_VARS) {
    root.style.removeProperty(cssVar);
  }
  APPLIED_VARS.clear();
}

function applyAppearance(
  root: HTMLElement,
  appearance: TenantAppearance | null,
  colorScheme: "light" | "dark",
) {
  clearAppliedVars(root);
  if (!appearance) return;

  const vars = appearanceToCssVariables(appearance, { colorScheme });
  for (const [cssVar, value] of Object.entries(vars)) {
    if (value.trim()) {
      root.style.setProperty(cssVar, value);
      APPLIED_VARS.add(cssVar);
    }
  }
}

export function TenantBrandingProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { tenantAppearance } = useAuth();
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    const root = document.documentElement;
    applyAppearance(root, tenantAppearance, colorScheme);
    return () => {
      clearAppliedVars(root);
    };
  }, [tenantAppearance, colorScheme]);

  return <>{children}</>;
}
