import {
  Checkbox,
  DatePicker,
  FieldError,
  FieldLabel,
  Input,
  Select,
  Switch,
  Text,
  Textarea,
  type DatePickerLabels,
  type SwitchVariant,
} from "@repo/ui";
import type { BooleanFieldDisplay } from "@repo/ui-builder-core";
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
import { ArrayEntityField } from "./ArrayEntityField";
import { resolveFieldComponent } from "./field-component-registry";
import { RelationPicker } from "./RelationPicker";
import { ManyToManyRelationPicker } from "./ManyToManyRelationPicker";

interface BooleanFieldOptions {
  readonly display?: BooleanFieldDisplay;
  readonly switchVariant?: SwitchVariant;
  readonly switchWidth?: number;
  readonly switchHeight?: number;
}

interface TextFieldOptions {
  readonly multiline?: boolean;
  readonly multilineRows?: number;
}

interface EntityFieldProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly value: unknown;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly recordId?: string;
  readonly booleanFieldOptions?: BooleanFieldOptions;
  readonly textFieldOptions?: TextFieldOptions;
  readonly hideLabel?: boolean;
  readonly onChange: (
    fieldName: string,
    value: unknown,
    displayRecord?: Record<string, unknown> | null,
  ) => void;
}

export function EntityField({
  entityName,
  fieldName,
  value,
  error,
  readOnly = false,
  recordId,
  booleanFieldOptions,
  textFieldOptions,
  hideLabel = false,
  onChange,
}: EntityFieldProps) {
  const { t } = useTranslation("common");
  const definition = useEntityDefinition(entityName);
  const meta = definition.fields[fieldName];
  if (!meta) return null;

  const fieldUI = definition.ui.fields?.[fieldName];
  const inputId = `${entityName}-${fieldName}`;
  const label = fieldUI?.label ?? formatFieldLabel(fieldName, definition);
  const controlAriaLabel = hideLabel ? label : undefined;
  const inlineLabel = hideLabel ? (
    <span className="sr-only">{label}</span>
  ) : (
    label
  );
  const componentId = resolveComponentId(fieldUI?.component, meta.type);
  const CustomField = resolveFieldComponent(componentId);
  const fileFieldMaxSizeBytes =
    meta.type === "image" || meta.type === "document"
      ? resolveFileFieldMaxSizeBytes(meta.type, meta.maxSizeBytes)
      : undefined;
  const defaultImageUrl =
    meta.type === "image" &&
    !meta.isArray &&
    meta.defaultImage &&
    "downloadUrl" in meta.defaultImage
      ? (meta.defaultImage.downloadUrl ?? null)
      : null;

  if (meta.isArray) {
    if ((meta.type === "document" || meta.type === "image") && CustomField) {
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
          hideLabel={hideLabel}
          isArray
          onChange={onChange}
        />
      );
    }

    return (
      <ArrayEntityField
        fieldName={fieldName}
        value={value}
        meta={meta}
        fieldUI={fieldUI}
        label={label}
        required={meta.required}
        error={error}
        readOnly={readOnly}
        inputId={inputId}
        hideLabel={hideLabel}
        onChange={onChange}
      />
    );
  }

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
        hideLabel={hideLabel}
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
          hideLabel={hideLabel}
          onChange={onChange}
        />
      );
    }

    if (!isDocumentStoredField(meta)) {
      return (
        <div className="flex flex-col gap-1">
          {hideLabel ? null : (
            <FieldLabel>
              {label || formatFieldLabel(fieldName, definition)}
            </FieldLabel>
          )}
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
        hideLabel={hideLabel}
        onChange={onChange}
      />
    );
  }

  if (meta.type === "boolean" || componentId === "toggle") {
    const booleanDisplay = booleanFieldOptions?.display ?? "checkbox";

    if (booleanDisplay === "switch") {
      const switchVariant = booleanFieldOptions?.switchVariant ?? "ios";

      if (switchVariant === "squared") {
        const squaredLabelId = `${inputId}-label`;

        return (
          <div className="flex flex-col gap-1">
            {hideLabel ? (
              <span id={squaredLabelId} className="sr-only">
                {label}
              </span>
            ) : (
              <FieldLabel id={squaredLabelId} required={meta.required}>
                {label}
              </FieldLabel>
            )}
            <Switch
              checked={Boolean(value)}
              disabled={readOnly}
              variant="squared"
              ariaLabelledBy={squaredLabelId}
              trueLabel={t("table.booleanYes")}
              falseLabel={t("table.booleanNo")}
              width={booleanFieldOptions?.switchWidth}
              height={booleanFieldOptions?.switchHeight}
              onChange={(checked) => onChange(fieldName, checked)}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-1">
          <Switch
            id={inputId}
            label={inlineLabel}
            checked={Boolean(value)}
            disabled={readOnly}
            variant="ios"
            width={booleanFieldOptions?.switchWidth}
            height={booleanFieldOptions?.switchHeight}
            onChange={(checked) => onChange(fieldName, checked)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <Checkbox
          id={inputId}
          label={inlineLabel}
          checked={Boolean(value)}
          disabled={readOnly}
          onChange={(event) => onChange(fieldName, event.target.checked)}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </div>
    );
  }

  if (meta.type === "date") {
    const dateModeRaw = fieldUI?.dateDisplayFormat ?? "datetime";
    const dateMode = dateModeRaw === "daysRemaining" ? "date" : dateModeRaw;
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
        <FieldLabel
          htmlFor={inputId}
          className={hideLabel ? "sr-only" : undefined}
          required={meta.required}
        >
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
        {hideLabel ? null : (
          <FieldLabel htmlFor={inputId} required={meta.required}>
            {label}
          </FieldLabel>
        )}
        <Select
          id={inputId}
          aria-label={controlAriaLabel}
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
        </Select>
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
        {hideLabel ? null : (
          <FieldLabel htmlFor={inputId} required={meta.required}>
            {label}
          </FieldLabel>
        )}
        <Input
          id={inputId}
          type="number"
          aria-label={controlAriaLabel}
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
      {hideLabel ? null : (
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
      )}
      {textFieldOptions?.multiline ? (
        <Textarea
          id={inputId}
          aria-label={controlAriaLabel}
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={fieldUI?.placeholder}
          rows={textFieldOptions.multilineRows ?? 3}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(fieldName, event.target.value)}
        />
      ) : (
        <Input
          id={inputId}
          type="text"
          aria-label={controlAriaLabel}
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={fieldUI?.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(fieldName, event.target.value)}
        />
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
