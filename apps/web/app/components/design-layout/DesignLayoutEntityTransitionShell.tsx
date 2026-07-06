import { Spinner } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface DesignLayoutEntityTransitionShellProps {
  readonly loading: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function DesignLayoutEntityTransitionShell({
  loading,
  children,
  className,
}: DesignLayoutEntityTransitionShellProps) {
  const { t } = useTranslation("common");

  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div
        className={cn(
          "min-h-0 flex-1",
          loading && "pointer-events-none opacity-50",
        )}
      >
        {children}
      </div>
      {loading ? (
        <div
          aria-hidden={false}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <Spinner size="md" ariaLabel={t("designLayout.switchingEntity")} />
        </div>
      ) : null}
    </div>
  );
}
