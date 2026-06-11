import { useRef, type ReactNode, type RefObject } from "react";

import { cn } from "@repo/theme/utils";

import { overlayTransitionStyle } from "../overlay/overlay-motion";
import {
  useOverlayTransitionDurationMs,
  useOverlayTransitionVisible,
} from "../overlay/useOverlayTransition";
import { ThirdRailHeader } from "./ThirdRailHeader";
import {
  resolveThirdRailWidthClasses,
  type ThirdRailWidthConfig,
} from "./third-rail-widths";

export type ThirdRailVariant = "push" | "overlay";

export interface ThirdRailProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly body: ReactNode;
  readonly footer?: ReactNode;
  readonly variant: ThirdRailVariant;
  readonly widths?: ThirdRailWidthConfig;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly titleId: string;
  readonly panelRef?: RefObject<HTMLDivElement | null>;
}

export function ThirdRail({
  title,
  subtitle,
  body,
  footer,
  variant,
  widths,
  closeLabel,
  onClose,
  titleId,
  panelRef,
}: ThirdRailProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const resolvedRef = panelRef ?? internalRef;
  const visible = useOverlayTransitionVisible();
  const durationMs = useOverlayTransitionDurationMs();
  const animate = durationMs > 0;
  const hasFooter = Boolean(footer);
  const widthClasses = resolveThirdRailWidthClasses(widths);

  return (
    <div
      ref={resolvedRef}
      role={variant === "overlay" ? "dialog" : "complementary"}
      aria-modal={variant === "overlay" ? true : undefined}
      aria-labelledby={titleId}
      tabIndex={variant === "overlay" ? -1 : undefined}
      className={cn(
        "bg-popover text-popover-foreground border-border pointer-events-auto flex h-full min-h-0 flex-col border-l shadow-xl",
        widthClasses,
        variant === "push" && "relative shrink-0",
        variant === "overlay" && "absolute top-0 right-0",
        animate && (visible ? "translate-x-0" : "translate-x-full"),
        !animate && "translate-x-0",
      )}
      style={overlayTransitionStyle(durationMs, "transform")}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <ThirdRailHeader
        titleId={titleId}
        title={title}
        subtitle={subtitle}
        closeLabel={closeLabel}
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-4">
        {body}
      </div>
      {hasFooter ? (
        <div className="border-border relative z-10 flex shrink-0 justify-end gap-2 border-t bg-popover px-5 py-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
