import { type ReactNode } from "react";
import { Columns2 } from "lucide-react";
import { Popover } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { getTreeNodeIcon } from "./form-designer-component-catalog";
import type { CatalogEntryKind } from "./form-designer-component-catalog";
import { useHoverPopover } from "./useHoverPopover";

interface FormDesignerStructureTreeUtilNodeProps {
  readonly id: string;
  readonly label: string;
  readonly kind: CatalogEntryKind;
  readonly rowFocusState?: "focused" | "selected" | "dimmed" | "none";
  readonly flyoutOpen: boolean;
  readonly onFlyoutOpenChange: (open: boolean) => void;
  readonly onHover?: () => void;
  readonly onLeave?: () => void;
  readonly onSelect?: () => void;
  readonly children: ReactNode;
}

export function FormDesignerStructureTreeUtilNode({
  id,
  label,
  kind,
  rowFocusState = "none",
  flyoutOpen,
  onFlyoutOpenChange,
  onHover,
  onLeave,
  onSelect,
  children,
}: FormDesignerStructureTreeUtilNodeProps) {
  const KindIcon = getTreeNodeIcon(kind) ?? Columns2;
  const {
    open,
    onTriggerMouseEnter,
    onTriggerMouseLeave,
    onPanelMouseEnter,
    onPanelMouseLeave,
    onTriggerFocus,
    onTriggerBlur,
  } = useHoverPopover({
    open: flyoutOpen,
    onOpenChange: onFlyoutOpenChange,
  });

  const handleTriggerMouseEnter = () => {
    onHover?.();
    onTriggerMouseEnter();
  };

  const handleTriggerMouseLeave = () => {
    onLeave?.();
    onTriggerMouseLeave();
  };

  return (
    <div
      role="treeitem"
      aria-label={label}
      data-tree-node-id={id}
      className="flex w-full justify-center"
      onMouseEnter={handleTriggerMouseEnter}
      onMouseLeave={handleTriggerMouseLeave}
      onFocus={onTriggerFocus}
      onBlur={onTriggerBlur}
    >
      <Popover
        open={open}
        onOpenChange={onFlyoutOpenChange}
        placement="right-start"
        layer="elevated"
        title={label}
        panelClassName="w-max min-w-0 p-3"
        className="flex justify-center"
        trigger={
          <button
            type="button"
            aria-label={label}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onSelect?.();
            }}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40",
              (rowFocusState === "focused" || rowFocusState === "selected") &&
                "bg-primary/10 text-primary ring-primary ring-2 ring-inset",
              rowFocusState === "dimmed" && "opacity-30 saturate-0",
              rowFocusState === "none" &&
                "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <KindIcon aria-hidden className="size-4" strokeWidth={2} />
          </button>
        }
      >
        <div
          className="w-max max-h-[min(24rem,70vh)] overflow-y-auto overflow-x-auto"
          onMouseEnter={onPanelMouseEnter}
          onMouseLeave={onPanelMouseLeave}
        >
          {children}
        </div>
      </Popover>
    </div>
  );
}
