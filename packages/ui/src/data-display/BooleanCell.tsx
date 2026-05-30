import { Check } from "lucide-react";

import { cn } from "@repo/theme/utils";

export interface BooleanCellProps {
  readonly value: boolean;
  readonly trueLabel?: string;
  readonly falseLabel?: string;
  readonly className?: string;
}

export function BooleanCell({
  value,
  trueLabel = "Yes",
  falseLabel = "No",
  className,
}: BooleanCellProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      aria-label={value ? trueLabel : falseLabel}
      role="img"
    >
      {value ? (
        <Check className="text-primary size-4" aria-hidden />
      ) : (
        <span
          className="border-muted-foreground/50 inline-block size-4 rounded-sm border"
          aria-hidden
        />
      )}
    </span>
  );
}
