import { Fragment, useMemo, useState } from "react";
import { RecursiveLayoutRenderer } from "@repo/ui-builder-renderer";
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

import { formatFieldLabel } from "../../entities/entity-catalog";
import { ExpandableTableRowExpandPanel } from "../../components/entity/ExpandableTableRowExpandPanel";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";
import type { EntityDefinitionLookup } from "@repo/ui-builder-react";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

export interface EntityExpandableTableLayoutPreviewProps {
  readonly definition: SerializableEntityDefinition;
  readonly columns: readonly GroupedTableColumn[];
  readonly rowExpandLayout: UiLayoutDocument;
  readonly showActions?: boolean;
  readonly previewItem: Record<string, unknown> | null;
  readonly title: string;
  readonly locale: string;
  readonly getDefinition?: EntityDefinitionLookup;
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
}: EntityExpandableTableLayoutPreviewProps) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(true);
  const renderContext = useMemo(
    () =>
      createEntityLayoutRenderContext({
        item: previewItem ?? {},
        definition,
        locale,
        getDefinition,
      }),
    [definition, getDefinition, locale, previewItem],
  );

  const columnCount = 1 + columns.length + (showActions ? 1 : 0);

  return (
    <div className="flex flex-col gap-2">
      <Text className="font-medium">{title}</Text>
      <TableCard className="w-full overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-2" aria-hidden />
                {columns.map((column) => (
                  <TableHead key={column.id}>
                    {column.label ?? formatFieldLabel(column.id, definition)}
                  </TableHead>
                ))}
                {showActions ? (
                  <TableHead className="text-center">
                    {t("entity.actions")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <Fragment>
                <TableRow
                  className="cursor-pointer"
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
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <RecursiveLayoutRenderer
                        layout={column.cellLayout}
                        context={renderContext}
                      />
                    </TableCell>
                  ))}
                  {showActions ? (
                    <TableCell className="text-muted-foreground text-center text-sm">
                      …
                    </TableCell>
                  ) : null}
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
