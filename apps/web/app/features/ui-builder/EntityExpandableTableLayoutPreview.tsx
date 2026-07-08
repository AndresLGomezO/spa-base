import { Fragment, useMemo, useState } from "react";
import {
  RecursiveLayoutRenderer,
  type NestedColumnWrapper,
  type RootColumnWrapper,
  type RowWrapper,
  usePreviewBreakpoint,
} from "@repo/ui-builder-renderer";
import type {
  GroupedTableColumn,
  SerializableEntityDefinition,
} from "@repo/entities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCard,
  Text,
} from "@repo/ui";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@repo/theme/utils";

import { resolveExpandableTableGroupedColumnDisplayLabel } from "./expandable-table-grouped-column-label.js";
import {
  groupedTableColumnVisibilityClassName,
  shouldRenderGroupedTableColumn,
} from "./grouped-table-column-display-range.js";
import {
  ExpandableTableRowActionsOverlay,
  resolveLastVisibleGroupedColumnIndex,
} from "../../components/entity/ExpandableTableRowActions";
import { ExpandableTableRowExpandPanel } from "../../components/entity/ExpandableTableRowExpandPanel";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";
import { layoutPreviewActions } from "./layout-preview-actions.js";
import type { EntityDefinitionLookup } from "@repo/ui-builder-react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

export interface LayoutPreviewRendererChromeProps {
  readonly rowWrapper?: RowWrapper;
  readonly rootColumnWrapper?: RootColumnWrapper;
  readonly nestedColumnWrapper?: NestedColumnWrapper;
}

export interface EntityExpandableTableLayoutPreviewProps {
  readonly definition: SerializableEntityDefinition;
  readonly columns: readonly GroupedTableColumn[];
  readonly rowExpandLayout: UiLayoutDocument;
  readonly showActions?: boolean;
  readonly previewItem: Record<string, unknown> | null;
  readonly title: string;
  readonly locale: string;
  readonly getDefinition?: EntityDefinitionLookup;
  readonly highlightedGroupedColumnIndex?: number | null;
  readonly getCellLayoutRendererProps?: (
    columnIndex: number,
  ) => LayoutPreviewRendererChromeProps | undefined;
  readonly rowExpandLayoutRendererProps?: LayoutPreviewRendererChromeProps;
}

export function EntityExpandableTableLayoutPreview({
  definition,
  columns,
  rowExpandLayout,
  showActions = true,
  previewItem,
  title,
  locale,
  getDefinition,
  highlightedGroupedColumnIndex = null,
  getCellLayoutRendererProps,
  rowExpandLayoutRendererProps,
}: EntityExpandableTableLayoutPreviewProps) {
  const { t } = useTranslation("common");
  const atBreakpoint = usePreviewBreakpoint();
  const [expanded, setExpanded] = useState(true);
  const renderContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: previewItem ?? {},
        definition,
        locale,
        getDefinition,
        relationLinkAppearance: true,
      }),
    [definition, getDefinition, locale, previewItem],
  );

  const columnCount = 1 + columns.length;
  const lastVisibleGroupedColumnIndex = resolveLastVisibleGroupedColumnIndex(
    columns,
    (column) => shouldRenderGroupedTableColumn(column, atBreakpoint),
  );
  const previewActions = showActions
    ? layoutPreviewActions({ ...rowExpandLayout, showActions: true }, t)
    : null;

  return (
    <div className="flex flex-col gap-2">
      {title ? <Text className="font-medium">{title}</Text> : null}
      <TableCard className="w-full overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-2" aria-hidden />
                {columns.map((column, columnIndex) =>
                  shouldRenderGroupedTableColumn(column, atBreakpoint) ? (
                    <TableHead
                      key={column.id}
                      className={groupedTableColumnVisibilityClassName(
                        column,
                        atBreakpoint,
                        highlightedGroupedColumnIndex === columnIndex
                          ? "bg-primary/10 ring-primary ring-2 ring-inset"
                          : undefined,
                      )}
                    >
                      {resolveExpandableTableGroupedColumnDisplayLabel(
                        column,
                        columnIndex,
                        definition,
                        (oneBasedIndex) =>
                          t("entity.viewSettings.columnTab", {
                            column: oneBasedIndex,
                          }),
                      )}
                    </TableHead>
                  ) : null,
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              <Fragment>
                <TableRow
                  className="relative cursor-pointer"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                >
                  <TableCell className="w-10 px-2">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
                      aria-label={
                        expanded
                          ? t("entity.expandableTable.collapseRow")
                          : t("entity.expandableTable.expandRow")
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpanded((value) => !value);
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
                          expanded && "rotate-90",
                        )}
                      />
                    </button>
                  </TableCell>
                  {columns.map((column, columnIndex) =>
                    shouldRenderGroupedTableColumn(column, atBreakpoint) ? (
                      <TableCell
                        key={column.id}
                        className={groupedTableColumnVisibilityClassName(
                          column,
                          atBreakpoint,
                          highlightedGroupedColumnIndex === columnIndex
                            ? "bg-primary/10 ring-primary ring-2 ring-inset"
                            : undefined,
                        )}
                      >
                        <RecursiveLayoutRenderer
                          layout={column.cellLayout}
                          context={renderContext}
                          {...(getCellLayoutRendererProps?.(columnIndex) ?? {})}
                        />
                        {showActions &&
                        previewActions &&
                        columnIndex === lastVisibleGroupedColumnIndex ? (
                          <ExpandableTableRowActionsOverlay>
                            {previewActions}
                          </ExpandableTableRowActionsOverlay>
                        ) : null}
                      </TableCell>
                    ) : null,
                  )}
                </TableRow>
                <TableRow>
                  <TableCell colSpan={columnCount} className="p-0">
                    <ExpandableTableRowExpandPanel
                      expanded={expanded}
                      contentClassName="bg-muted/30 p-4"
                    >
                      <RecursiveLayoutRenderer
                        layout={rowExpandLayout}
                        context={renderContext}
                        {...(rowExpandLayoutRendererProps ?? {})}
                      />
                    </ExpandableTableRowExpandPanel>
                  </TableCell>
                </TableRow>
              </Fragment>
            </TableBody>
          </Table>
        </div>
      </TableCard>
    </div>
  );
}
