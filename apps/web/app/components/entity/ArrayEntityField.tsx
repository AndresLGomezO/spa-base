import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { FieldUIConfig, SerializableFieldMeta } from "@repo/entities";
import {
  DatePicker,
  FieldError,
  FieldLabel,
  FilterValueBadge,
  IconButton,
  Input,
  type DatePickerLabels,
  Select,
} from "@repo/ui";

import {
  appendArrayItem,
  coerceArrayValue,
  formatArrayItemForDisplay,
  parseDraftBoolean,
  parseDraftNumber,
  parseDraftString,
  removeArrayItemAt,
} from "./array-field-value";

interface ArrayEntityFieldProps {
  readonly fieldName: string;
  readonly value: unknown;
  readonly meta: SerializableFieldMeta;
  readonly fieldUI?: FieldUIConfig;
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly inputId: string;
  readonly hideLabel?: boolean;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

const selectClassName =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2";

function usesManualAddTrigger(type: SerializableFieldMeta["type"]): boolean {
  return type === "string" || type === "number";
}

export function ArrayEntityField({
  fieldName,
  value,
  meta,
  fieldUI,
  label,
  required,
  error,
  readOnly = false,
  inputId,
  hideLabel = false,
  onChange,
}: ArrayEntityFieldProps) {
  const { t, i18n } = useTranslation("common");
  const items = coerceArrayValue(value);
  const [draftText, setDraftText] = useState("");
  const [draftDate, setDraftDate] = useState<string | undefined>(undefined);
  const [selectValue, setSelectValue] = useState("");

  const dateMode = fieldUI?.dateDisplayFormat ?? "datetime";
  const datePickerLabels: DatePickerLabels = {
    placeholder: t("entity.datePicker.placeholder"),
    clear: t("entity.datePicker.clear"),
    previous: t("entity.datePicker.previous"),
    next: t("entity.datePicker.next"),
    am: t("entity.datePicker.am"),
    pm: t("entity.datePicker.pm"),
    hour: t("entity.datePicker.hour"),
    minute: t("entity.datePicker.minute"),
  };

  function commitItems(nextItems: unknown[]) {
    onChange(fieldName, nextItems.length > 0 ? nextItems : []);
  }

  function addItem(item: unknown) {
    const nextItems = appendArrayItem(items, item, {
      dedupe: true,
      fieldType: meta.type,
    });
    if (nextItems.length === items.length) {
      return;
    }
    commitItems(nextItems);
  }

  function tryAddFromDraft() {
    if (readOnly) {
      return;
    }

    if (meta.type === "string") {
      const parsed = parseDraftString(draftText);
      if (!parsed) {
        return;
      }
      addItem(parsed);
      setDraftText("");
      return;
    }

    if (meta.type === "number") {
      const parsed = parseDraftNumber(draftText, {
        integer: meta.numberKind === "integer",
      });
      if (parsed === undefined) {
        return;
      }
      addItem(parsed);
      setDraftText("");
    }
  }

  function handleSelectAdd(nextValue: string) {
    if (!nextValue || readOnly) {
      return;
    }

    if (meta.type === "boolean") {
      const parsed = parseDraftBoolean(nextValue);
      if (parsed === undefined) {
        return;
      }
      addItem(parsed);
      setSelectValue("");
      return;
    }

    if (meta.type === "enum") {
      addItem(nextValue);
      setSelectValue("");
    }
  }

  function handleDateAdd(nextValue: string | undefined) {
    if (!nextValue || readOnly) {
      setDraftDate(undefined);
      return;
    }
    addItem(nextValue);
    setDraftDate(undefined);
  }

  function renderEntryControl() {
    if (meta.type === "string") {
      return (
        <Input
          id={inputId}
          type="text"
          className="min-w-0 flex-1"
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={
            fieldUI?.placeholder ?? t("entity.arrayStringPlaceholder")
          }
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              tryAddFromDraft();
            }
          }}
        />
      );
    }

    if (meta.type === "number") {
      const isInteger = meta.numberKind === "integer";
      return (
        <Input
          id={inputId}
          type="number"
          step={isInteger ? 1 : "any"}
          className="min-w-0 flex-1"
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={
            fieldUI?.placeholder ?? t("entity.arrayNumberPlaceholder")
          }
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              tryAddFromDraft();
            }
          }}
        />
      );
    }

    if (meta.type === "boolean") {
      return (
        <Select
          id={inputId}
          className={`${selectClassName} min-w-0 flex-1`}
          disabled={readOnly}
          value={selectValue}
          onChange={(event) => handleSelectAdd(event.target.value)}
        >
          <option value="">{t("entity.arrayBooleanPlaceholder")}</option>
          <option value="true">{t("entity.arrayBooleanTrue")}</option>
          <option value="false">{t("entity.arrayBooleanFalse")}</option>
        </Select>
      );
    }

    if (meta.type === "enum") {
      const enumValues = meta.enumValues ?? [];
      const availableValues = enumValues.filter(
        (option) =>
          !items.some(
            (item) => typeof item === "string" && item.trim() === option.trim(),
          ),
      );

      return (
        <Select
          id={inputId}
          className={`${selectClassName} min-w-0 flex-1`}
          disabled={readOnly || availableValues.length === 0}
          value={selectValue}
          onChange={(event) => handleSelectAdd(event.target.value)}
        >
          <option value="">{t("entity.arrayEnumPlaceholder")}</option>
          {availableValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    }

    if (meta.type === "date") {
      return (
        <div className="min-w-0 flex-1">
          <DatePicker
            id={inputId}
            mode={dateMode}
            value={draftDate}
            onChange={handleDateAdd}
            disabled={readOnly}
            hasError={Boolean(error)}
            labels={datePickerLabels}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : undefined}
        required={required}
      >
        {label}
      </FieldLabel>

      <div className="flex items-start gap-2">
        {renderEntryControl()}
        {usesManualAddTrigger(meta.type) ? (
          <IconButton
            label={t("entity.arrayAddValue")}
            size="sm"
            disabled={readOnly || draftText.trim().length === 0}
            className="border-border bg-background mt-0.5 shrink-0 border"
            onClick={tryAddFromDraft}
          >
            <Plus className="size-4" />
          </IconButton>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, index) => {
            const displayValue = formatArrayItemForDisplay(
              item,
              meta,
              i18n.language,
              fieldUI,
            );
            if (readOnly) {
              return (
                <span
                  key={`${displayValue}-${index}`}
                  className="border-border bg-muted text-foreground inline-flex max-w-full items-center rounded-lg border px-2 py-0.5 text-xs font-medium shadow-sm"
                >
                  <span className="max-w-[180px] truncate">{displayValue}</span>
                </span>
              );
            }
            return (
              <FilterValueBadge
                key={`${displayValue}-${index}`}
                label={displayValue}
                removeAriaLabel={t("entity.arrayRemoveValue", {
                  value: displayValue,
                })}
                onRemove={() => commitItems(removeArrayItemAt(items, index))}
              />
            );
          })}
        </div>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
