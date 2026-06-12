import { useCallback, useRef } from "react";

const DEFAULT_CLOSE_DELAY_MS = 150;

interface UseHoverPopoverOptions {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly closeDelayMs?: number;
}

export function useHoverPopover({
  open,
  onOpenChange,
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}: UseHoverPopoverOptions) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    clearCloseTimer();
    onOpenChange(true);
  }, [clearCloseTimer, onOpenChange]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => onOpenChange(false), closeDelayMs);
  }, [clearCloseTimer, closeDelayMs, onOpenChange]);

  return {
    open,
    onTriggerMouseEnter: openPopover,
    onTriggerMouseLeave: scheduleClose,
    onPanelMouseEnter: openPopover,
    onPanelMouseLeave: scheduleClose,
    onTriggerFocus: openPopover,
    onTriggerBlur: scheduleClose,
  };
}
