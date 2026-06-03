import { useEffect, useRef, useState, type RefObject } from "react";

interface UseIntersectionVisibilityOptions {
  readonly enabled?: boolean;
}

export function useIntersectionVisibility(
  options: UseIntersectionVisibilityOptions = {},
): {
  readonly ref: RefObject<HTMLDivElement | null>;
  readonly isVisible: boolean;
} {
  const enabled = options.enabled ?? true;
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry?.isIntersecting ?? false);
      },
      { threshold: [0, 1] },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return { ref, isVisible };
}
