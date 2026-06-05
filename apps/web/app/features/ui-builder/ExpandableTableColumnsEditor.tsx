import type {
  GroupedTableColumn,
  SerializableEntityDefinition,
  UiLayoutDocument,
} from "@repo/entities";
import {
  createDefaultTableCellLayout,
  createLayoutId,
} from "@repo/ui-builder-core";
import { Button, Input, Text } from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EntityCardLayoutBuilder } from "./EntityCardLayoutBuilder.js";
import type {
  EntityDefinitionLookup,
  UiLayoutStructurePanelLabels,
} from "@repo/ui-builder-react";

interface ExpandableTableColumnsEditorProps {
  readonly definition: SerializableEntityDefinition;
  readonly availableFields: readonly string[];
  readonly columns: readonly GroupedTableColumn[];
  readonly onChange: (columns: readonly GroupedTableColumn[]) => void;
  readonly showActions: boolean;
  readonly onShowActionsChange: (showActions: boolean) => void;
  readonly defaultFieldPath: string;
  readonly structureLabels: Omit<
    UiLayoutStructurePanelLabels,
    "layoutJsonImport"
  >;
  readonly getDefinition?: EntityDefinitionLookup;
}

function moveColumn(
  columns: readonly GroupedTableColumn[],
  index: number,
  direction: -1 | 1,
): readonly GroupedTableColumn[] {
  const target = index + direction;
  if (target < 0 || target >= columns.length) {
    return columns;
  }
  const next = [...columns];
  const [item] = next.splice(index, 1);
  if (item === undefined) {
    return columns;
  }
  next.splice(target, 0, item);
  return next;
}

function updateColumn(
  columns: readonly GroupedTableColumn[],
  index: number,
  patch: Partial<GroupedTableColumn>,
): readonly GroupedTableColumn[] {
  return columns.map((column, columnIndex) =>
    columnIndex === index ? { ...column, ...patch } : column,
  );
}

export function ExpandableTableColumnsEditor({
  definition,
  availableFields,
  columns,
  onChange,
  showActions,
  onShowActionsChange,
  defaultFieldPath,
  structureLabels,
  getDefinition,
}: ExpandableTableColumnsEditorProps) {
  const { t } = useTranslation("common");

  const addColumn = () => {
    const field =
      availableFields[columns.length] ?? availableFields[0] ?? defaultFieldPath;
    onChange([
      ...columns,
      {
        id: createLayoutId("column"),
        cellLayout: createDefaultTableCellLayout([field]),
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-muted-foreground text-sm">
        {t("designLayout.expandableTableColumnsDescription")}
      </Text>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showActions}
          onChange={(event) => onShowActionsChange(event.target.checked)}
        />
        <span>{t("designLayout.tableShowActionsColumn")}</span>
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            {t("designLayout.addExpandableTableColumn")}
          </Button>
        </div>

        {columns.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.tableColumnsEmpty")}
          </Text>
        ) : (
          columns.map((column, index) => (
            <div
              key={column.id}
              className="border-border flex flex-col gap-3 rounded-md border p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("designLayout.expandableTableColumnLabel")}
                  </span>
                  <Input
                    value={column.label ?? ""}
                    placeholder={column.id}
                    onChange={(event) =>
                      onChange(
                        updateColumn(columns, index, {
                          label: event.target.value || undefined,
                        }),
                      )
                    }
                  />
                </label>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={index === 0}
                    aria-label={t("designLayout.moveColumnUp")}
                    onClick={() => onChange(moveColumn(columns, index, -1))}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={index === columns.length - 1}
                    aria-label={t("designLayout.moveColumnDown")}
                    onClick={() => onChange(moveColumn(columns, index, 1))}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={columns.length <= 1}
                    aria-label={t("designLayout.removeColumn")}
                    onClick={() =>
                      onChange(
                        columns.filter(
                          (_, columnIndex) => columnIndex !== index,
                        ),
                      )
                    }
                  >
                    ×
                  </Button>
                </div>
              </div>

              <EntityCardLayoutBuilder
                layout={column.cellLayout}
                definition={definition}
                defaultFieldPath={defaultFieldPath}
                onLayoutChange={(cellLayout: UiLayoutDocument) =>
                  onChange(updateColumn(columns, index, { cellLayout }))
                }
                labels={structureLabels}
                designSurface="tableColumnCell"
                getDefinition={getDefinition}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
