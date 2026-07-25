import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { AiSparkIcon } from "../icons/AiSparkIcon";
import { IconButton } from "../icon-button/IconButton";
import { Text } from "../typography/Text";
import type { ThirdRailTone } from "./ThirdRail";

export interface ThirdRailHeaderProps {
  readonly titleId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly headerActions?: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly tone?: ThirdRailTone;
}

export function ThirdRailHeader({
  titleId,
  title,
  subtitle,
  headerActions,
  closeLabel,
  onClose,
  tone = "default",
}: ThirdRailHeaderProps) {
  const isAiTone = tone === "ai";

  return (
    <div
      className={cn(
        "border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4",
        isAiTone && "third-rail-header-ai",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isAiTone ? <AiSparkIcon size={22} animated /> : null}
          <h2
            id={titleId}
            className={cn(
              "text-foreground text-lg font-semibold",
              isAiTone && "third-rail-title-ai",
            )}
          >
            {title}
          </h2>
        </div>
        {subtitle ? (
          <Text variant="muted" className={cn("mt-1 truncate text-sm")}>
            {subtitle}
          </Text>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {headerActions}
        <IconButton
          label={closeLabel}
          size="sm"
          className="shrink-0"
          onClick={onClose}
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </IconButton>
      </div>
    </div>
  );
}
