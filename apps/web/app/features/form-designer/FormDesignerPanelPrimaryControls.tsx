import { cn } from "@repo/theme/utils";
import type { ReactNode } from "react";

interface FormDesignerPanelPrimaryControlsProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function FormDesignerPanelPrimaryControls({
  children,
  className,
}: FormDesignerPanelPrimaryControlsProps) {
  return (
    <div
      className={cn(
        "border-primary/20 bg-primary/5 flex flex-wrap items-start gap-4 rounded-lg border border-dashed px-3 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
