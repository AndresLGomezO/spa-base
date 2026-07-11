import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { motionPressNeedsHost, type MotionPress } from "@repo/ui-builder-core";

import { REDUCED_MOTION_MEDIA } from "./resolve-motion.js";

export interface MotionPressHostProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onPointerDown"
> {
  readonly press?: MotionPress;
  readonly pressDurationMs?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
}

interface RippleInk {
  readonly id: number;
  readonly size: number;
  readonly left: number;
  readonly top: number;
}

function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_MEDIA).matches;
}

function defaultDurationMs(press: MotionPress | undefined): number {
  switch (press) {
    case "ripple":
      return 600;
    case "wave":
    case "slide":
      return 500;
    default:
      return 200;
  }
}

/**
 * Row host that adds pointer-driven press overlays for ripple / wave / slide.
 * Glow, neon, and pop rely on CSS `:active` only and pass through unchanged.
 */
export function MotionPressHost({
  press,
  pressDurationMs,
  className,
  style,
  children,
  ...domProps
}: MotionPressHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<readonly RippleInk[]>([]);
  const [pressActive, setPressActive] = useState(false);
  const rippleIdRef = useRef(0);
  const clearActiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const durationMs = pressDurationMs ?? defaultDurationMs(press);
  const needsHost = motionPressNeedsHost(press);

  useEffect(() => {
    return () => {
      if (clearActiveTimerRef.current !== null) {
        clearTimeout(clearActiveTimerRef.current);
      }
    };
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!needsHost || prefersReducedMotion()) {
        return;
      }

      const host = hostRef.current;
      if (!host) {
        return;
      }

      if (press === "ripple") {
        const rect = host.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const radius = size / 2;
        const id = rippleIdRef.current + 1;
        rippleIdRef.current = id;
        setRipples((current) => [
          ...current.filter((ink) => ink.id !== id),
          {
            id,
            size,
            left: event.clientX - rect.left - radius,
            top: event.clientY - rect.top - radius,
          },
        ]);
        window.setTimeout(() => {
          setRipples((current) => current.filter((ink) => ink.id !== id));
        }, durationMs);
        return;
      }

      if (press === "wave" || press === "slide") {
        if (clearActiveTimerRef.current !== null) {
          clearTimeout(clearActiveTimerRef.current);
        }
        setPressActive(false);
        // Restart animation by clearing then setting on next frame.
        requestAnimationFrame(() => {
          setPressActive(true);
          clearActiveTimerRef.current = setTimeout(() => {
            setPressActive(false);
            clearActiveTimerRef.current = null;
          }, durationMs);
        });
      }
    },
    [durationMs, needsHost, press],
  );

  return (
    <div
      {...domProps}
      ref={hostRef}
      className={className}
      style={style}
      data-press-active={pressActive ? "" : undefined}
      onPointerDown={needsHost ? onPointerDown : undefined}
    >
      {press === "wave" ? (
        <span className="ui-motion-press-wave-flash" aria-hidden />
      ) : null}
      {press === "slide" ? (
        <span className="ui-motion-press-slide-sheen" aria-hidden />
      ) : null}
      {ripples.map((ink) => (
        <span
          key={ink.id}
          className="ui-motion-press-ripple-ink"
          aria-hidden
          style={{
            width: ink.size,
            height: ink.size,
            left: ink.left,
            top: ink.top,
          }}
        />
      ))}
      {children}
    </div>
  );
}
