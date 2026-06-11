import { type ReactNode } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { cn } from "@repo/theme/utils";

interface FormDesignerStructureTreeRowActionsProps {
  readonly moveUpLabel: string;
  readonly moveDownLabel: string;
  readonly deleteLabel: string;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onDelete: () => void;
}

function RowActionButton({
  label,
  disabled,
  onClick,
  destructive = false,
  children,
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly destructive?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 shadow-none",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
        destructive
          ? "text-muted-foreground hover:text-destructive disabled:hover:text-muted-foreground"
          : "text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function FormDesignerStructureTreeRowActions({
  moveUpLabel,
  moveDownLabel,
  deleteLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: FormDesignerStructureTreeRowActionsProps) {
  return (
    <div
      className={cn(
        "ml-1 flex shrink-0 items-center gap-0.5",
        "opacity-0 transition-opacity duration-150",
        "group-hover/node:opacity-100 group-focus-within/node:opacity-100",
      )}
    >
      <RowActionButton
        label={moveUpLabel}
        disabled={!canMoveUp}
        onClick={onMoveUp}
      >
        <ArrowUp aria-hidden className="size-3.5" strokeWidth={2} />
      </RowActionButton>
      <RowActionButton
        label={moveDownLabel}
        disabled={!canMoveDown}
        onClick={onMoveDown}
      >
        <ArrowDown aria-hidden className="size-3.5" strokeWidth={2} />
      </RowActionButton>
      <RowActionButton label={deleteLabel} destructive onClick={onDelete}>
        <Trash2 aria-hidden className="size-3.5" strokeWidth={2} />
      </RowActionButton>
    </div>
  );
}
