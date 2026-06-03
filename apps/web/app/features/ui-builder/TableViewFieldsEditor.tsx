import type { SerializableEntityDefinition } from "@repo/entities";
import { Button, Text } from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { formatFieldLabel } from "../../entities/entity-catalog";

const SELECT_CLASS =
  "border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

interface TableViewFieldsEditorProps {
  readonly definition: SerializableEntityDefinition;
  readonly availableFields: readonly string[];
  readonly selectedFields: readonly string[];
  readonly onChange: (fields: readonly string[]) => void;
  readonly showActions: boolean;
  readonly onShowActionsChange: (showActions: boolean) => void;
  readonly canConfigureActions?: boolean;
}

function moveField(
  fields: readonly string[],
  index: number,
  direction: -1 | 1,
): readonly string[] {
  const target = index + direction;
  if (target < 0 || target >= fields.length) {
    return fields;
  }
  const next = [...fields];
  const [item] = next.splice(index, 1);
  if (item === undefined) {
    return fields;
  }
  next.splice(target, 0, item);
  return next;
}

export function TableViewFieldsEditor({
  definition,
  availableFields,
  selectedFields,
  onChange,
  showActions,
  onShowActionsChange,
  canConfigureActions = true,
}: TableViewFieldsEditorProps) {
  const { t } = useTranslation("common");

  const unselectedFields = useMemo(
    () => availableFields.filter((field) => !selectedFields.includes(field)),
    [availableFields, selectedFields],
  );

  const addField = (fieldName: string) => {
    if (!fieldName || selectedFields.includes(fieldName)) {
      return;
    }
    onChange([...selectedFields, fieldName]);
  };

  const removeField = (fieldName: string) => {
    if (selectedFields.length <= 1) {
      return;
    }
    onChange(selectedFields.filter((field) => field !== fieldName));
  };

  return (
    <div className="flex flex-col gap-4">
      <Text className="text-muted-foreground text-sm">
        {t("designLayout.tableFieldsDescription")}
      </Text>

      {canConfigureActions ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showActions}
            onChange={(event) => onShowActionsChange(event.target.checked)}
          />
          <span>{t("designLayout.tableShowActionsColumn")}</span>
        </label>
      ) : null}

      <div className="flex flex-col gap-2">
        <Text className="text-sm font-medium">
          {t("designLayout.tableColumnOrder")}
        </Text>
        {selectedFields.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("designLayout.tableColumnsEmpty")}
          </Text>
        ) : (
          <ul className="border-border divide-border flex flex-col divide-y rounded-md border">
            {selectedFields.map((fieldName, index) => (
              <li
                key={fieldName}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  {formatFieldLabel(fieldName, definition)}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {fieldName}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={index === 0}
                    aria-label={t("designLayout.moveColumnUp")}
                    onClick={() =>
                      onChange(moveField(selectedFields, index, -1))
                    }
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={index === selectedFields.length - 1}
                    aria-label={t("designLayout.moveColumnDown")}
                    onClick={() =>
                      onChange(moveField(selectedFields, index, 1))
                    }
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={selectedFields.length <= 1}
                    aria-label={t("designLayout.removeColumn")}
                    onClick={() => removeField(fieldName)}
                  >
                    ×
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {unselectedFields.length > 0 ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">
            {t("designLayout.addTableColumn")}
          </span>
          <select
            className={SELECT_CLASS}
            value=""
            onChange={(event) => {
              addField(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">
              {t("designLayout.addTableColumnPlaceholder")}
            </option>
            {unselectedFields.map((fieldName) => (
              <option key={fieldName} value={fieldName}>
                {formatFieldLabel(fieldName, definition)} ({fieldName})
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
