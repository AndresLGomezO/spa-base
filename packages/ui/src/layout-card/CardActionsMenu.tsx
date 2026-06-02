import { useState, type MouseEvent } from "react";
import { MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { IconButton } from "../icon-button/IconButton.js";
import { Popover } from "../popover/Popover.js";
import { Text } from "../typography/Text.js";

export interface CardActionItem {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly badgeCount?: number;
}

export interface CardActionsMenuProps {
  readonly actions: readonly CardActionItem[];
  readonly className?: string;
  readonly triggerLabel?: string;
}

export function CardActionsMenu({
  actions,
  className,
  triggerLabel = "Actions",
}: CardActionsMenuProps) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) {
    return null;
  }

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      layer="elevated"
      className={className}
      panelClassName="w-44 p-2"
      trigger={
        <IconButton
          label={triggerLabel}
          size="sm"
          className="hover:bg-muted size-8 rounded-lg"
          onClick={handleTriggerClick}
        >
          <MoreVertical className="size-4" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            className={cn(
              "hover:bg-muted flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              action.destructive
                ? "text-destructive hover:text-destructive"
                : "text-foreground",
            )}
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              action.onSelect();
            }}
          >
            {action.id === "edit" ? (
              <Pencil className="size-4 shrink-0" />
            ) : null}
            {action.id === "share" ? (
              <Share2 className="size-4 shrink-0" />
            ) : null}
            {action.id === "delete" ? (
              <Trash2 className="size-4 shrink-0" />
            ) : null}
            <span className="flex-1">{action.label}</span>
            {action.badgeCount && action.badgeCount > 0 ? (
              <Text className="text-muted-foreground text-xs">
                {action.badgeCount}
              </Text>
            ) : null}
          </button>
        ))}
      </div>
    </Popover>
  );
}
