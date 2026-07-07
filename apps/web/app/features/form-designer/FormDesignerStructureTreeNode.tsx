import { ChevronDown, ChevronUp, Columns2 } from "lucide-react";
import { cn } from "@repo/theme/utils";

import { getTreeNodeIcon } from "./form-designer-component-catalog";
import type { CatalogEntryKind } from "./form-designer-component-catalog";
import { FormDesignerStructureTreeRowActions } from "./FormDesignerStructureTreeRowActions";

interface FormDesignerStructureTreeNodeProps {
  readonly id: string;
  readonly label: string;
  readonly kind: CatalogEntryKind;
  readonly depth: number;
  readonly expanded: boolean;
  readonly expandable: boolean;
  readonly expandAriaLabel: string;
  readonly collapseAriaLabel: string;
  readonly onToggle: () => void;
  readonly showRowActions?: boolean;
  readonly canMoveUp?: boolean;
  readonly canMoveDown?: boolean;
  readonly moveUpLabel?: string;
  readonly moveDownLabel?: string;
  readonly deleteLabel?: string;
  readonly onMoveUp?: () => void;
  readonly onMoveDown?: () => void;
  readonly onDelete?: () => void;
  readonly rowFocusState?: "focused" | "selected" | "dimmed" | "none";
  readonly rowActionsEnabled?: boolean;
  readonly onRowHover?: () => void;
  readonly onRowLeave?: () => void;
  readonly onRowSelect?: () => void;
}

export function FormDesignerStructureTreeNode({
  id,
  label,
  kind,
  depth,
  expanded,
  expandable,
  expandAriaLabel,
  collapseAriaLabel,
  onToggle,
  showRowActions = false,
  canMoveUp = false,
  canMoveDown = false,
  moveUpLabel = "",
  moveDownLabel = "",
  deleteLabel = "",
  onMoveUp,
  onMoveDown,
  onDelete,
  rowFocusState = "none",
  rowActionsEnabled = true,
  onRowHover,
  onRowLeave,
  onRowSelect,
}: FormDesignerStructureTreeNodeProps) {
  const KindIcon = getTreeNodeIcon(kind) ?? Columns2;
  const ToggleIcon = expanded ? ChevronUp : ChevronDown;
  const isRowInteractive = onRowHover != null;

  return (
    <div
      role="treeitem"
      aria-expanded={expandable ? expanded : undefined}
      aria-labelledby={`${id}-label`}
      data-tree-node-id={id}
      className={cn(
        "group/node flex w-full min-w-0 items-center gap-1 rounded-md py-1.5 pr-2 transition-all duration-150",
        (rowFocusState === "focused" || rowFocusState === "selected") &&
          "bg-primary/10 ring-primary ring-2 ring-inset",
        rowFocusState === "dimmed" && "opacity-30 saturate-0",
        rowFocusState === "none" && "hover:bg-muted/50",
      )}
      style={{ paddingLeft: `${depth * 6 + 4}px` }}
      onMouseEnter={onRowHover}
      onMouseLeave={onRowLeave}
      onClick={
        isRowInteractive &&
        (rowFocusState === "focused" || rowFocusState === "selected") &&
        onRowSelect
          ? (event) => {
              event.stopPropagation();
              onRowSelect();
            }
          : undefined
      }
    >
      {expandable ? (
        <button
          type="button"
          aria-label={expanded ? collapseAriaLabel : expandAriaLabel}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 appearance-none border-0 bg-transparent p-0 shadow-none focus-visible:outline-none"
        >
          <ToggleIcon aria-hidden className="size-3.5" strokeWidth={2} />
        </button>
      ) : (
        <span aria-hidden className="inline-block w-3.5 shrink-0" />
      )}

      <KindIcon
        aria-hidden
        className="text-muted-foreground size-3.5 shrink-0"
        strokeWidth={2}
      />

      <span
        id={`${id}-label`}
        className="text-foreground min-w-0 flex-1 cursor-default truncate text-sm font-medium"
      >
        {label}
      </span>

      {showRowActions &&
      rowActionsEnabled &&
      onMoveUp &&
      onMoveDown &&
      onDelete ? (
        <FormDesignerStructureTreeRowActions
          moveUpLabel={moveUpLabel}
          moveDownLabel={moveDownLabel}
          deleteLabel={deleteLabel}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}
