import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** Overlay enter/exit length (ms). */
const OVERLAY_TRANSITION_MS = 200;

interface OverlayTransitionContextValue {
  readonly visible: boolean;
  readonly durationMs: number;
}

const OverlayTransitionContext = createContext<OverlayTransitionContextValue>({
  visible: true,
  durationMs: OVERLAY_TRANSITION_MS,
});

export function useOverlayTransitionVisible(): boolean {
  return useContext(OverlayTransitionContext).visible;
}

export function useOverlayTransitionDurationMs(): number {
  return useContext(OverlayTransitionContext).durationMs;
}

export function OverlayTransitionVisibleProvider({
  visible,
  durationMs,
  children,
}: {
  readonly visible: boolean;
  readonly durationMs: number;
  readonly children: ReactNode;
}) {
  return createElement(
    OverlayTransitionContext.Provider,
    { value: { visible, durationMs } },
    children,
  );
}

function getTransitionDurationMs(): number {
  if (typeof window === "undefined") {
    return OVERLAY_TRANSITION_MS;
  }
  // TODO: restore reduced-motion skip after validation:
  // if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  return OVERLAY_TRANSITION_MS;
}

export function useOverlayTransition(open: boolean): {
  readonly mounted: boolean;
  readonly visible: boolean;
  readonly durationMs: number;
} {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [durationMs] = useState(getTransitionDurationMs);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);

      if (durationMs === 0) {
        setVisible(true);
        return;
      }

      let outerFrame = 0;
      let innerFrame = 0;
      outerFrame = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setVisible(true));
      });

      return () => {
        cancelAnimationFrame(outerFrame);
        cancelAnimationFrame(innerFrame);
      };
    }

    setVisible(false);
    if (durationMs === 0) {
      setMounted(false);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, open]);

  return { mounted, visible, durationMs };
}
