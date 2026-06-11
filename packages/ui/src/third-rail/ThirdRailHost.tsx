import { useCallback, useEffect, useId, useRef } from "react";

import { OverlayRoot } from "../overlay/OverlayRoot";
import {
  OverlayTransitionVisibleProvider,
  useOverlayTransition,
} from "../overlay/useOverlayTransition";
import { ThirdRail } from "./ThirdRail";
import { useThirdRail } from "./useThirdRail";

function usePushEscapeClose(enabled: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onClose]);
}

export function ThirdRailHost() {
  const { isOpen, options, close } = useThirdRail();
  const { mounted, visible, durationMs } = useOverlayTransition(isOpen);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const focusPanel = useCallback(() => {
    panelRef.current?.focus();
  }, []);

  if (!mounted || !options) {
    return null;
  }

  const resizeContent = options.resizeContent !== false;
  const closeLabel = options.closeLabel ?? "Close panel";

  const panel = (
    <ThirdRail
      titleId={titleId}
      title={options.title}
      subtitle={options.subtitle}
      headerActions={options.headerActions}
      body={options.body}
      footer={options.footer}
      variant={resizeContent ? "push" : "overlay"}
      widths={options.widths}
      closeLabel={closeLabel}
      onClose={close}
      panelRef={panelRef}
    />
  );

  if (!resizeContent) {
    return (
      <OverlayRoot
        open={isOpen}
        onClose={close}
        closeLabel={closeLabel}
        focusPanel={focusPanel}
        contentClassName="relative h-full"
      >
        {panel}
      </OverlayRoot>
    );
  }

  return (
    <OverlayTransitionVisibleProvider visible={visible} durationMs={durationMs}>
      <PushThirdRailEscape onClose={close} />
      {panel}
    </OverlayTransitionVisibleProvider>
  );
}

function PushThirdRailEscape({ onClose }: { readonly onClose: () => void }) {
  usePushEscapeClose(true, onClose);
  return null;
}
