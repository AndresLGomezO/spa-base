import { cn } from "@repo/theme/utils";

import { focusRingInsetClassName } from "../focus-ring/focus-ring-classes";

export const jsonActionTriggerButtonClassName = cn(
  "text-foreground hover:bg-muted/80 inline-flex h-7 shrink-0 items-center gap-1 px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  "[&:not(:last-child)]:border-border [&:not(:last-child)]:border-r",
  focusRingInsetClassName,
);

export const jsonActionTriggerClusterClassName =
  "border-border bg-muted/30 inline-flex shrink-0 overflow-hidden rounded-md border";
