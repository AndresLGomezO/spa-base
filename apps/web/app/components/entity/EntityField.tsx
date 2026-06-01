import {
  Checkbox,
  DatePicker,
  FieldError,
  FieldLabel,
  Input,
  Text,
  type DatePickerLabels,
} from "@repo/ui";
import { resolveComponentId } from "@repo/ui-builder";
import {
  isDocumentStoredField,
  isJoinCollectionRelationField,
  resolveFileFieldMaxSizeBytes,
} from "@repo/entities";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import { resolveFieldComponent } from "./field-component-registry";
import { RelationPicker } from "./RelationPicker";
import { ManyToManyRelationPicker } from "./ManyToManyRelationPicker";

interface EntityFieldProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly value: unknown;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly recordId?: string;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

export function EntityField({
  entityName,
  fieldName,
  value,
  error,
  readOnly = false,
  recordId,
  onChange,
}: EntityFieldProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const meta = definition.fields[fieldName];
  if (!meta) return null;

  const fieldUI = definition.ui.fields?.[fieldName];
  const inputId = `${entityName}-${fieldName}`;
  const label = fieldUI?.label ?? formatFieldLabel(fieldName, definition);
  const componentId = resolveComponentId(fieldUI?.component, meta.type);
  const CustomField = resolveFieldComponent(componentId);
  const fileFieldMaxSizeBytes =
    meta.type === "image" || meta.type === "document"
      ? resolveFileFieldMaxSizeBytes(meta.type, meta.maxSizeBytes)
      : undefined;
  const defaultImageUrl =
    meta.type === "image" &&
    meta.defaultImage &&
    "downloadUrl" in meta.defaultImage
      ? (meta.defaultImage.downloadUrl ?? null)
      : null;

  if (CustomField) {
    return (
      <CustomField
        entityName={entityName}
        fieldName={fieldName}
        value={value}
        label={label}
        required={meta.required}
        error={error}
        readOnly={readOnly}
        recordId={recordId}
        maxSizeBytes={fileFieldMaxSizeBytes}
        defaultImageUrl={defaultImageUrl}
        onChange={onChange}
      />
    );
  }

  if (meta.type === "relation" || componentId === "relation") {
    const target = meta.relation?.target;
    if (!target) return null;

    if (isJoinCollectionRelationField(meta)) {
      return (
        <ManyToManyRelationPicker
          entityName={entityName}
          fieldName={fieldName}
          targetEntity={target}
          value={value}
          label={label}
          required={meta.required}
          error={error}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    }

    if (!isDocumentStoredField(meta)) {
      return (
        <div className="flex flex-col gap-1">
          <FieldLabel>
            {label || formatFieldLabel(fieldName, definition)}
          </FieldLabel>
          <Text className="text-muted-foreground text-sm">
            {t("entity.relationOneToManyReadOnly")}
          </Text>
        </div>
      );
    }

    return (
      <RelationPicker
        entityName={entityName}
        fieldName={fieldName}
        targetEntity={target}
        value={value}
        label={label}
        required={meta.required}
        error={error}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  if (meta.type === "boolean" || componentId === "toggle") {
    return (
      <div className="flex flex-col gap-1">
        <Checkbox
          id={inputId}
          label={label}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onChange(fieldName, event.target.checked)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "date") {
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

    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <DatePicker
          id={inputId}
          mode={dateMode}
          value={typeof value === "string" ? value : undefined}
          onChange={(next) => onChange(fieldName, next)}
          disabled={readOnly}
          hasError={Boolean(error)}
          labels={datePickerLabels}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "enum" || componentId === "select") {
    const enumValues = meta.enumValues ?? [];
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <select
          id={inputId}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          disabled={readOnly}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(fieldName, event.target.value)}
        >
          <option value="">Select…</option>
          {enumValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "number" || componentId === "number") {
    const isInteger = meta.numberKind === "integer";

    function parseNumberInput(raw: string): number | undefined {
      if (raw === "") {
        return undefined;
      }
      if (isInteger) {
        if (!/^-?\d+$/.test(raw.trim())) {
          return undefined;
        }
        return Number.parseInt(raw, 10);
      }
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <Input
          id={inputId}
          type="number"
          step={isInteger ? 1 : "any"}
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={fieldUI?.placeholder}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => {
            const next = parseNumberInput(event.target.value);
            if (event.target.value !== "" && next === undefined) {
              return;
            }
            onChange(fieldName, next);
          }}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={inputId} required={meta.required}>
        {label}
      </FieldLabel>
      <Input
        id={inputId}
        type="text"
        hasError={Boolean(error)}
        disabled={readOnly}
        placeholder={fieldUI?.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(fieldName, event.target.value)}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
