import { useCallback, useEffect } from "react";

export function useOverlayLock(
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
    if (!open) return;

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      focusPanel?.();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [focusPanel, handleKeyDown, open]);
}
