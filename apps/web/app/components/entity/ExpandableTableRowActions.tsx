import { IconButton } from "@repo/ui";
import { Eye, Pencil, Share2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface ExpandableTableRowActionsProps {
  readonly canRead: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canEditRow: boolean;
  readonly canDeleteRow: boolean;
  readonly canShareRow: boolean;
  readonly item: Record<string, unknown>;
  readonly labels: {
    readonly view: string;
    readonly edit: string;
    readonly share: string;
    readonly delete: string;
  };
  readonly onView: (id: string) => void;
  readonly onEdit?: (id: string) => void;
  readonly onShare?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
}

export function ExpandableTableRowActions({
  canRead,
  canUpdate,
  canDelete,
  canEditRow,
  canDeleteRow,
  canShareRow,
  item,
  labels,
  onView,
  onEdit,
  onShare,
  onDelete,
}: ExpandableTableRowActionsProps) {
  const itemId = String(item.id);
  const sharedWith = item.sharedWith as Record<string, string> | undefined;
  const shareCount = sharedWith ? Object.keys(sharedWith).length : 0;

  return (
    <>
      {canRead ? (
        <IconButton
          type="button"
          label={labels.view}
          onClick={() => onView(itemId)}
        >
          <Eye className="size-4" />
        </IconButton>
      ) : null}
      {canUpdate && (!item.ownerId || canEditRow) && onEdit ? (
        <IconButton
          type="button"
          label={labels.edit}
          onClick={() => onEdit(itemId)}
        >
          <Pencil className="size-4" />
        </IconButton>
      ) : null}
      {item.ownerId !== undefined && canShareRow && onShare ? (
        <IconButton
          type="button"
          label={labels.share}
          onClick={() => onShare(itemId)}
        >
          <span className="relative inline-flex">
            <Share2 className="size-4" />
            {shareCount > 0 ? (
              <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-medium leading-none">
                {shareCount}
              </span>
            ) : null}
          </span>
        </IconButton>
      ) : null}
      {canDelete && (!item.ownerId || canDeleteRow) && onDelete ? (
        <IconButton
          type="button"
          label={labels.delete}
          onClick={() => onDelete(itemId)}
        >
          <Trash2 className="text-destructive size-4" />
        </IconButton>
      ) : null}
    </>
  );
}

interface ExpandableTableRowActionsOverlayProps {
  readonly children: ReactNode;
}

export function ExpandableTableRowActionsOverlay({
  children,
}: ExpandableTableRowActionsOverlayProps) {
  return (
    <div
      className="absolute end-3 top-3 z-10 flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function resolveLastVisibleGroupedColumnIndex<
  TColumn extends { readonly id: string },
>(
  columns: readonly TColumn[],
  isVisible: (column: TColumn) => boolean,
): number {
  let lastVisibleIndex = -1;

  columns.forEach((column, columnIndex) => {
    if (isVisible(column)) {
      lastVisibleIndex = columnIndex;
    }
  });

  return lastVisibleIndex;
}
