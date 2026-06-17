import {
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@repo/theme/utils";

/** Matches `--animate-layout-card-sweep` duration in theme tokens. */
export const LAYOUT_CARD_FLASH_SWEEP_MS = 1400;

/** Delay before `onClick` after a tap flash so the sweep is visible before navigation. */
export const LAYOUT_CARD_FLASH_ACTIVATION_DELAY_MS = 500;

export interface LayoutCardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly interactive?: boolean;
  readonly variant?: "default" | "gradient";
  /**
   * When set, a tap that triggers the sweep waits this long before calling `onClick`.
   * Pair with navigation handlers so route changes do not unmount the card mid-flash.
   */
  readonly clickActivationDelayMs?: number;
}

const TAP_MOVE_TOLERANCE_PX = 12;

function shouldIgnoreCardFlash(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest(
      "a, button, [role='button'], input, select, textarea, [data-card-action]",
    ) != null
  );
}

function hasMovedBeyondTapTolerance(
  start: { readonly x: number; readonly y: number },
  currentX: number,
  currentY: number,
): boolean {
  const deltaX = currentX - start.x;
  const deltaY = currentY - start.y;
  return (
    deltaX * deltaX + deltaY * deltaY >
    TAP_MOVE_TOLERANCE_PX * TAP_MOVE_TOLERANCE_PX
  );
}

export function LayoutCard({
  children,
  actions,
  interactive = false,
  variant = "default",
  clickActivationDelayMs,
  className,
  onClick,
  onPointerDown,
  ...props
}: LayoutCardProps) {
  const [flashTick, setFlashTick] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerTrackingCleanupRef = useRef<(() => void) | null>(null);
  const clickActivationTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (clickActivationTimeoutRef.current != null) {
        window.clearTimeout(clickActivationTimeoutRef.current);
      }
    },
    [],
  );

  const clearPointerTracking = useCallback(() => {
    pointerTrackingCleanupRef.current?.();
    pointerTrackingCleanupRef.current = null;
    pointerStartRef.current = null;
    pointerMovedRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  const triggerFlash = useCallback(() => {
    setFlashTick((tick) => tick + 1);
  }, []);

  const startPointerTracking = useCallback(
    (pointerId: number, startX: number, startY: number) => {
      clearPointerTracking();

      pointerStartRef.current = { x: startX, y: startY };
      pointerMovedRef.current = false;
      activePointerIdRef.current = pointerId;

      const handlePointerMove = (event: PointerEvent) => {
        if (
          event.pointerId !== pointerId ||
          !pointerStartRef.current ||
          pointerMovedRef.current
        ) {
          return;
        }

        if (
          hasMovedBeyondTapTolerance(
            pointerStartRef.current,
            event.clientX,
            event.clientY,
          )
        ) {
          pointerMovedRef.current = true;
        }
      };

      const handlePointerEnd = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) {
          return;
        }

        pointerTrackingCleanupRef.current?.();
        pointerTrackingCleanupRef.current = null;
        activePointerIdRef.current = null;
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);

      pointerTrackingCleanupRef.current = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };
    },
    [clearPointerTracking],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (interactive && !shouldIgnoreCardFlash(event.target)) {
        startPointerTracking(event.pointerId, event.clientX, event.clientY);
      } else {
        clearPointerTracking();
      }

      onPointerDown?.(event);
    },
    [clearPointerTracking, interactive, onPointerDown, startPointerTracking],
  );

  const handleClick = useCallback<
    NonNullable<HTMLAttributes<HTMLDivElement>["onClick"]>
  >(
    (event) => {
      const shouldFlash =
        interactive &&
        !shouldIgnoreCardFlash(event.target) &&
        !pointerMovedRef.current;

      if (shouldFlash) {
        triggerFlash();
      }

      clearPointerTracking();

      const activationDelay =
        shouldFlash &&
        clickActivationDelayMs != null &&
        clickActivationDelayMs > 0
          ? clickActivationDelayMs
          : 0;

      if (activationDelay > 0) {
        if (clickActivationTimeoutRef.current != null) {
          window.clearTimeout(clickActivationTimeoutRef.current);
        }

        clickActivationTimeoutRef.current = window.setTimeout(() => {
          clickActivationTimeoutRef.current = null;
          onClick?.(event);
        }, activationDelay);
        return;
      }

      onClick?.(event);
    },
    [
      clearPointerTracking,
      clickActivationDelayMs,
      interactive,
      onClick,
      triggerFlash,
    ],
  );

  return (
    <article
      className={cn(
        "border-border bg-card relative flex flex-col gap-3 overflow-hidden rounded-lg border p-macro shadow-card transition-all duration-200",
        variant === "gradient" &&
          "border-0 text-primary-foreground [background:var(--gradient-primary)]",
        interactive &&
          "hover:border-border/80 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]",
        className,
      )}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...props}
    >
      {interactive && flashTick > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg"
        >
          <div
            key={flashTick}
            className="animate-layout-card-sweep absolute -inset-full bg-[linear-gradient(135deg,transparent_0%,transparent_36%,color-mix(in_oklch,var(--color-primary-300)_18%,transparent)_42%,color-mix(in_oklch,var(--color-primary-400)_42%,white_58%)_50%,color-mix(in_oklch,var(--color-primary-300)_18%,transparent)_58%,transparent_64%,transparent_100%)]"
          />
        </div>
      ) : null}
      {actions ? (
        <div className="absolute end-3 top-3 z-10 shrink-0" data-card-action="">
          {actions}
        </div>
      ) : null}
      <div className="min-h-0 w-full min-w-0">{children}</div>
    </article>
  );
}
