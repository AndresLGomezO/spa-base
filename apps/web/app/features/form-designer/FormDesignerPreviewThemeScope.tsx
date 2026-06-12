import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import type { ColorScheme } from "@repo/theme/react";
import { appearanceToCssVariables } from "@repo/theme/tenant-overrides";
import { cn } from "@repo/theme/utils";

import { useAuth } from "../../auth/AuthContext";

interface FormDesignerPreviewThemeScopeProps {
  readonly colorScheme: ColorScheme;
  readonly children: ReactNode;
  readonly className?: string;
}

export function FormDesignerPreviewThemeScope({
  colorScheme,
  children,
  className,
}: FormDesignerPreviewThemeScopeProps) {
  const { tenantAppearance } = useAuth();
  const previewVars = useMemo(
    () =>
      appearanceToCssVariables(tenantAppearance ?? {}, {
        colorScheme,
        scopedPreview: true,
      }),
    [colorScheme, tenantAppearance],
  );

  return (
    <div
      className={cn(
        colorScheme === "dark" ? "dark" : "preview-theme-light",
        "text-foreground",
        className,
      )}
      style={previewVars as CSSProperties}
    >
      {children}
    </div>
  );
}
