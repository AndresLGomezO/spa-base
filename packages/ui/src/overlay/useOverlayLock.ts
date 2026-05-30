import { useCallback, useEffect } from "react";

export function useOverlayLock(
  mounted: boolean,
  open: boolean,
  onClose: () => void,
  focusPanel?: () => void,
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

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

    const focusTimer = window.setTimeout(() => {
      focusPanel?.();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [focusPanel, handleKeyDown, open]);
}
