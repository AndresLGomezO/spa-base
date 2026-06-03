import { Button, Heading } from "@repo/ui";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { FieldAccessLevel, SerializableEntityDefinition } from "@repo/entities";
import { isFieldEditable, isFieldVisible } from "@repo/ui-builder";

import type { EntityName } from "../../entities/entity-catalog";
import { EntityField } from "../../components/entity/EntityField";
import { ENTITY_FORM_ID } from "../../components/entity/EntityForm";
import { getFieldAccessLevel } from "../../hooks/useFieldAccess";

export function createEntityFormRenderContext(options: {
  readonly entityName: EntityName;
  readonly definition: SerializableEntityDefinition;
  readonly locale: string;
  readonly mode: "create" | "edit";
  readonly values: Record<string, unknown>;
  readonly errors: Readonly<Record<string, string | undefined>>;
  readonly fieldAccess: Readonly<Record<string, FieldAccessLevel>>;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly recordId?: string;
  readonly onChange: (fieldName: string, value: unknown) => void;
  readonly onCancel: () => void;
  readonly hideActions?: boolean;
  readonly isSubmitting?: boolean;
  readonly cancelLabel: string;
  readonly saveLabel: string;
}): LayoutRenderContext {
  const canWrite = options.canWrite;

  return {
    mode: "form",
    data: options.values,
    locale: options.locale,
    resolveField: (path) => options.values[path],
    fieldAccessFilter: (fieldPath) => {
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const fieldUI = options.definition.ui.fields?.[root];
      const access = getFieldAccessLevel(options.fieldAccess, root);
      return isFieldVisible(fieldUI, options.canRead, access);
    },
    formFieldRenderer: (fieldPath, containerClassName) => {
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const fieldUI = options.definition.ui.fields?.[root];
      const access = getFieldAccessLevel(options.fieldAccess, root);
      if (!isFieldVisible(fieldUI, options.canRead, access)) {
        return null;
      }
      return (
        <div className={containerClassName}>
          <EntityField
            entityName={options.entityName}
            fieldName={root}
            value={options.values[root]}
            error={options.errors[root]}
            readOnly={!isFieldEditable(fieldUI, canWrite, access)}
            recordId={options.recordId}
            onChange={options.onChange}
          />
        </div>
      );
    },
    formSectionRenderer: (title, children) => (
      <div className="flex flex-col gap-4">
        {title ? <Heading level={2}>{title}</Heading> : null}
        {children}
      </div>
    ),
    formActionsRenderer: () =>
      options.hideActions ? null : (
        <div className="flex items-center gap-3">
          <Button type="submit" form={ENTITY_FORM_ID} loading={options.isSubmitting}>
            {options.saveLabel}
          </Button>
          <Button type="button" variant="outline" onClick={options.onCancel}>
            {options.cancelLabel}
          </Button>
        </div>
      ),
  };
}
