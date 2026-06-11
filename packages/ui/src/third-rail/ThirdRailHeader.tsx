import type { ReactNode } from "react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton";
import { Text } from "../typography/Text";

export interface ThirdRailHeaderProps {
  readonly titleId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly headerActions?: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
}

export function ThirdRailHeader({
  titleId,
  title,
  subtitle,
  headerActions,
  closeLabel,
  onClose,
}: ThirdRailHeaderProps) {
  return (
    <div className="border-border flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-foreground text-lg font-semibold">
          {title}
        </h2>
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
