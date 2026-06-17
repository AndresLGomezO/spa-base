import type { TenantAppearance } from "@repo/shared-types";
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";
import { useColorScheme } from "@repo/theme/react";
import { useLayoutEffect, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  clearCachedTenantAppearance,
  readBootstrapTenantAppearance,
  writeCachedTenantAppearance,
} from "./tenant-appearance-cache";

const APPLIED_VARS = new Set<string>();

/** Legacy tenant themes wrote the macro spacing value to Tailwind's multiplier. */
const LEGACY_TENANT_CSS_VARS = ["--spacing"] as const;

function clearAppliedVars(root: HTMLElement) {
  for (const cssVar of APPLIED_VARS) {
    root.style.removeProperty(cssVar);
  }
  APPLIED_VARS.clear();

  for (const cssVar of LEGACY_TENANT_CSS_VARS) {
    root.style.removeProperty(cssVar);
  }
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
  const { tenantAppearance, tenantId, isAuthenticated, isSessionResolved } =
    useAuth();
  const { colorScheme } = useColorScheme();

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!isAuthenticated) {
      clearAppliedVars(root);
      clearCachedTenantAppearance();
    } else if (!isSessionResolved) {
      applyAppearance(root, readBootstrapTenantAppearance(), colorScheme);
    } else {
      if (tenantId) {
        writeCachedTenantAppearance(tenantId, tenantAppearance);
      }

      applyAppearance(root, tenantAppearance, colorScheme);
    }

    return () => {
      clearAppliedVars(root);
    };
  }, [
    colorScheme,
    isAuthenticated,
    isSessionResolved,
    tenantAppearance,
    tenantId,
  ]);

  return <>{children}</>;
}
