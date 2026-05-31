import { Checkbox, FieldError, FieldLabel, Input, Text } from "@repo/ui";
import { resolveComponentId } from "@repo/ui-builder";
import {
  isDocumentStoredField,
  isJoinCollectionRelationField,
} from "@repo/entities";
import { useTranslation } from "react-i18next";

import {
  formatFieldLabel,
  type EntityName,
} from "../../entities/entity-catalog";
import { useEntityDefinition } from "../../entities/entity-catalog-context";
import {
  datetimeLocalValueToIso,
  isoToDatetimeLocalValue,
} from "./entity-field-utils";
import { resolveFieldComponent } from "./field-component-registry";
import { RelationPicker } from "./RelationPicker";
import { ManyToManyRelationPicker } from "./ManyToManyRelationPicker";

interface EntityFieldProps {
  readonly entityName: EntityName;
  readonly fieldName: string;
  readonly value: unknown;
  readonly error?: string;
  readonly readOnly?: boolean;
  readonly onChange: (fieldName: string, value: unknown) => void;
}

export function EntityField({
  entityName,
  fieldName,
  value,
  error,
  readOnly = false,
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
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <Input
          id={inputId}
          type="datetime-local"
          hasError={Boolean(error)}
          disabled={readOnly}
          value={isoToDatetimeLocalValue(
            typeof value === "string" ? value : null,
          )}
          onChange={(event) =>
            onChange(fieldName, datetimeLocalValueToIso(event.target.value))
          }
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
    return (
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={inputId} required={meta.required}>
          {label}
        </FieldLabel>
        <Input
          id={inputId}
          type="number"
          hasError={Boolean(error)}
          disabled={readOnly}
          placeholder={fieldUI?.placeholder}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) =>
            onChange(
              fieldName,
              event.target.value === ""
                ? undefined
                : Number(event.target.value),
            )
          }
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
