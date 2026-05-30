import { useCallback, useEffect, useRef } from "react";

export function useOverlayLock(
  mounted: boolean,
  open: boolean,
  onClose: () => void,
  focusPanel?: () => void,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onCloseRef.current();
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, open]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const focusTimer = window.setTimeout(() => {
        focusPanel?.();
      }, 0);

      return () => {
        window.clearTimeout(focusTimer);
      };
    }

    if (!open) {
      wasOpenRef.current = false;
    }
  }, [focusPanel, open]);
}
