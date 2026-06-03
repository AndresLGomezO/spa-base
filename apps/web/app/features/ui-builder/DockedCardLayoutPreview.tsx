import { cn } from "@repo/theme/utils";

import { useIntersectionVisibility } from "../../hooks/useIntersectionVisibility.js";
import { useMainContentInset } from "../../hooks/useMainContentInset.js";
import {
  EntityCardListLayoutPreview,
  type EntityCardListLayoutPreviewProps,
} from "./EntityCardListLayoutPreview.js";

interface DockedCardLayoutPreviewProps extends EntityCardListLayoutPreviewProps {
  readonly enabled: boolean;
}

export function DockedCardLayoutPreview({
  enabled,
  ...previewProps
}: DockedCardLayoutPreviewProps) {
  const { ref, isVisible } = useIntersectionVisibility({ enabled });
  const mainInset = useMainContentInset(enabled);
  const showFloating = enabled && !isVisible && mainInset !== null;

  return (
    <>
      <div ref={ref} className="scroll-mt-4">
        <EntityCardListLayoutPreview {...previewProps} />
      </div>

      {enabled && mainInset ? (
        <div
          aria-hidden={!showFloating}
          style={{
            top: mainInset.top,
            left: mainInset.left,
            width: mainInset.width,
          }}
          className={cn(
            "fixed z-40 box-border transition-all duration-300 ease-out",
            showFloating
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <div className="border-border bg-background/95 box-border w-full border-b px-6 py-4 shadow-md backdrop-blur-sm">
            <EntityCardListLayoutPreview {...previewProps} />
          </div>
        </div>
      ) : null}
    </>
  );
}
