import { cn } from "@repo/theme/utils";

import { AiSparkIcon } from "../icons/AiSparkIcon.js";
import "./ai-builder-loading.css";

export interface AiBuilderLoadingIconProps {
  readonly size?: number;
  readonly className?: string;
  readonly label?: string;
}

export function AiBuilderLoadingIcon({
  size = 20,
  className,
  label,
}: AiBuilderLoadingIconProps) {
  return (
    <span
      className={cn("ai-builder-loading relative inline-flex", className)}
      aria-label={label}
      role="status"
    >
      <span className="ai-builder-loading-ring absolute inset-0 rounded-full" />
      <AiSparkIcon size={size} animated className="relative z-10" />
    </span>
  );
}
