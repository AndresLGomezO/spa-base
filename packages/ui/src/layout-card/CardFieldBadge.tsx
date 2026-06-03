import type { CSSProperties } from "react";

import { cn } from "@repo/theme/utils";

import {
  resolveBadgeVariant,
  type CardBadgeVariant,
} from "./badge-variants.js";

const badgeVariantClasses: Record<CardBadgeVariant, string> = {
  success: "bg-badge-success text-badge-success-foreground",
  warning: "bg-badge-warning text-badge-warning-foreground",
  danger: "bg-badge-danger text-badge-danger-foreground",
  info: "bg-badge-info text-badge-info-foreground",
  default: "bg-badge-default text-badge-default-foreground",
  active: "bg-badge-success text-badge-success-foreground",
  pending: "bg-badge-warning text-badge-warning-foreground",
  closed: "bg-badge-danger text-badge-danger-foreground",
  neutral: "bg-badge-default text-badge-default-foreground",
};

export interface CardFieldBadgeProps {
  readonly value: React.ReactNode;
  readonly variant?: CardBadgeVariant;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function CardFieldBadge({
  value,
  variant = "default",
  className,
  style,
}: CardFieldBadgeProps) {
  const displayValue =
    value === null || value === undefined || value === "" ? "—" : value;

  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium",
        badgeVariantClasses[variant],
        className,
      )}
      style={style}
    >
      {displayValue}
    </span>
  );
}

export { resolveBadgeVariant };
