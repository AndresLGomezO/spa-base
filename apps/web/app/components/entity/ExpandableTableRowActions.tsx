import { AiSparkIcon, IconButton } from "@repo/ui";
import { Eye, Pencil, Share2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { SummaryStaleIndicator } from "../../features/entity-summary/SummaryStaleIndicator";

interface ExpandableTableRowActionsProps {
  readonly canRead: boolean;
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canEditRow: boolean;
  readonly canDeleteRow: boolean;
  readonly canShareRow: boolean;
  readonly item: Record<string, unknown>;
  readonly summaryField?: string;
  /** Pre-resolved summary markdown (e.g. from AI record summary doc). */
  readonly summaryText?: string;
  /** When true, show a discreet stale icon on the summary action. */
  readonly summaryStale?: boolean;
  readonly labels: {
    readonly view: string;
    readonly edit: string;
    readonly share: string;
    readonly delete: string;
    readonly summary: string;
    readonly summaryOutOfSync?: string;
  };
  readonly onView: (id: string) => void;
  readonly onEdit?: (id: string) => void;
  readonly onShare?: (id: string) => void;
  readonly onDelete?: (id: string) => void;
  readonly onSummary?: (item: Record<string, unknown>, text: string) => void;
}

function resolveRowSummaryText(
  item: Record<string, unknown>,
  summaryField: string | undefined,
  summaryTextOverride: string | undefined,
): string {
  if (typeof summaryTextOverride === "string") {
    return summaryTextOverride.trim();
  }
  if (!summaryField) {
    return "";
  }
  if (summaryField.includes(".")) {
    return "";
  }
  const value = item[summaryField];
  return typeof value === "string" ? value.trim() : "";
}

export function ExpandableTableRowActions({
  canRead,
  canUpdate,
  canDelete,
  canEditRow,
  canDeleteRow,
  canShareRow,
  item,
  summaryField,
  summaryText: summaryTextOverride,
  summaryStale = false,
  labels,
  onView,
  onEdit,
  onShare,
  onDelete,
  onSummary,
}: ExpandableTableRowActionsProps) {
  const itemId = String(item.id);
  const sharedWith = item.sharedWith as Record<string, string> | undefined;
  const shareCount = sharedWith ? Object.keys(sharedWith).length : 0;
  const summaryText = resolveRowSummaryText(
    item,
    summaryField,
    summaryTextOverride,
  );
  const summaryLabel =
    summaryStale && labels.summaryOutOfSync
      ? `${labels.summary} — ${labels.summaryOutOfSync}`
      : labels.summary;

  return (
    <>
      {(summaryText.length > 0 || summaryStale) && onSummary ? (
        <IconButton
          type="button"
          label={summaryLabel}
          onClick={() => onSummary(item, summaryText)}
          className="relative text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          <span className="relative inline-flex items-center">
            <AiSparkIcon size={16} animated className="shrink-0" />
            {summaryStale ? (
              <SummaryStaleIndicator className="absolute -right-2 -top-2 rounded-full bg-background/90 p-px shadow-sm" />
            ) : null}
          </span>
        </IconButton>
      ) : null}
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
