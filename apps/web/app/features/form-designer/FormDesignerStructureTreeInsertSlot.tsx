import { Plus } from "lucide-react";
import { cn } from "@repo/theme/utils";

import type { InsertAnchor } from "./form-designer-structure-tree";

interface FormDesignerStructureTreeInsertSlotProps {
  readonly ariaLabel: string;
  readonly anchor: InsertAnchor;
  readonly onInsert: (anchor: InsertAnchor) => void;
  readonly disabled?: boolean;
}

export function FormDesignerStructureTreeInsertSlot({
  ariaLabel,
  anchor,
  onInsert,
  disabled = false,
}: FormDesignerStructureTreeInsertSlotProps) {
  return (
    <div
      className={cn(
        "group/insert relative flex h-5 items-center",
        disabled && "pointer-events-none",
      )}
      aria-disabled={disabled || undefined}
    >
      <div
        aria-hidden
        className={cn(
          "border-border/70 absolute inset-x-2 top-1/2 border-t border-dashed",
          !disabled && "transition-colors duration-200",
          !disabled && "group-hover/insert:border-primary/60",
          !disabled && "group-focus-within/insert:border-primary/60",
        )}
      />
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        onClick={disabled ? undefined : () => onInsert(anchor)}
        className={cn(
          "bg-background text-muted-foreground ring-border/60 relative z-10 mx-auto flex size-6 items-center justify-center rounded-full shadow-sm ring-1",
          "opacity-0 scale-90 transition-all duration-200 ease-out",
          !disabled &&
            "group-hover/insert:opacity-100 group-hover/insert:scale-100",
          !disabled &&
            "group-focus-within/insert:opacity-100 group-focus-within/insert:scale-100",
          !disabled &&
            "hover:bg-primary hover:text-primary-foreground hover:ring-primary/40 hover:shadow-md",
          !disabled &&
            "focus-visible:opacity-100 focus-visible:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
          !disabled && "cursor-pointer",
        )}
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
