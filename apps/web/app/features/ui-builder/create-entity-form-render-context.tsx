import type { NavigateFunction } from "react-router";
import { Button, Heading } from "@repo/ui";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type {
  FieldAccessLevel,
  SerializableEntityDefinition,
} from "@repo/entities";
import type { ResolvedComponentClickTarget } from "@repo/ui-builder-core";
import { isFieldEditable, isFieldVisible } from "@repo/ui-builder";

import type {
  EntityCatalogEntry,
  EntityName,
} from "../../entities/entity-catalog";
import { formatFieldLabel } from "../../entities/entity-catalog";
import { EntityField } from "../../components/entity/EntityField";
import { EntityFieldSelector } from "../../components/entity/EntityFieldSelector";
import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import { ENTITY_FORM_ID } from "../../components/entity/entity-form-constants";
import { resolveEntityCellValue } from "../../components/entity/resolve-entity-cell-value";
import { resolveEntityFieldPath } from "../../components/entity/resolve-entity-field-path";
import {
  resolveLayoutSlotDisplayMeta,
  resolveLayoutSlotLabel,
} from "../../components/entity/resolve-layout-slot-display";
import { getFieldAccessLevel } from "../../hooks/useFieldAccess";
import { createComponentClickContextHelpers } from "./create-component-click-context-helpers.js";
import { createEntityLayoutRenderContext } from "./create-entity-layout-render-context.js";
import { formComponentContainerClassName } from "./form-component-container-class-name";

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
  readonly onChange: (
    fieldName: string,
    value: unknown,
    displayRecord?: Record<string, unknown> | null,
  ) => void;
  readonly onCancel: () => void;
  readonly hideActions?: boolean;
  readonly isSubmitting?: boolean;
  readonly cancelLabel: string;
  readonly saveLabel: string;
  readonly wizardStepContent?: boolean;
  readonly getDefinition?: (
    entityName: string,
  ) => EntityCatalogEntry | undefined;
  readonly usePreviewSamples?: boolean;
  readonly navigate?: NavigateFunction;
  readonly navigateComponentClick?: (
    target: ResolvedComponentClickTarget,
  ) => void;
}): LayoutRenderContext {
  const canWrite = options.canWrite;
  const getDefinition = options.getDefinition;

  const layoutImageContext = createEntityLayoutRenderContext({
    item: options.values,
    definition: options.definition,
    locale: options.locale,
    getDefinition,
    usePreviewPlaceholder: true,
    usePreviewSamples: options.usePreviewSamples,
  });

  const resolvePreviewSampleValue = options.usePreviewSamples
    ? (fieldPath: string) =>
        resolveLayoutSlotLabel(fieldPath, options.definition, getDefinition)
    : layoutImageContext.resolvePreviewSampleValue;

  const clickItem =
    options.recordId != null
      ? { ...options.values, id: options.recordId }
      : options.values;

  const resolveField = (path: string) =>
    resolveEntityFieldPath(
      options.values,
      path,
      options.definition,
      () => null,
    );

  return {
    mode: "form",
    wizardStepContent: options.wizardStepContent,
    data: options.values,
    locale: options.locale,
    resolveField,
    resolveFieldMeta: (path) => {
      const meta = resolveLayoutSlotDisplayMeta(
        path,
        options.definition,
        getDefinition,
      );
      const root = path.includes(".") ? (path.split(".")[0] ?? path) : path;
      const fieldMeta = options.definition.fields[root];
      return fieldMeta?.isArray ? { ...meta, isArray: true as const } : meta;
    },
    resolveFieldLabel: (path) =>
      resolveLayoutSlotLabel(path, options.definition, getDefinition),
    resolvePreviewSampleValue,
    resolveCurrencyCode: () =>
      options.definition.fields.currencyId
        ? resolveEntityCellValue(
            options.values,
            "currencyId",
            options.definition,
            () => null,
          )
        : undefined,
    fieldAccessFilter: (fieldPath) => {
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const fieldUI = options.definition.ui.fields?.[root];
      const access = getFieldAccessLevel(options.fieldAccess, root);
      return isFieldVisible(fieldUI, options.canRead, access);
    },
    formFieldRenderer: (config, containerClassName) => {
      const fieldPath = config.fieldPath;
      const root = fieldPath.includes(".")
        ? (fieldPath.split(".")[0] ?? fieldPath)
        : fieldPath;
      const fieldUI = options.definition.ui.fields?.[root];
      const access = getFieldAccessLevel(options.fieldAccess, root);
      if (!isFieldVisible(fieldUI, options.canRead, access)) {
        return null;
      }
      const booleanFieldOptions =
        config.booleanDisplay ||
        config.switchVariant ||
        config.switchWidth !== undefined ||
        config.switchHeight !== undefined
          ? {
              display: config.booleanDisplay,
              switchVariant: config.switchVariant,
              switchWidth: config.switchWidth,
              switchHeight: config.switchHeight,
            }
          : undefined;
      const textFieldOptions = config.multiline
        ? {
            multiline: true,
            multilineRows: config.multilineRows,
          }
        : undefined;
      return (
        <div className={formComponentContainerClassName(containerClassName)}>
          <EntityField
            entityName={options.entityName}
            fieldName={root}
            value={options.values[root]}
            error={options.errors[root]}
            readOnly={!isFieldEditable(fieldUI, canWrite, access)}
            recordId={options.recordId}
            booleanFieldOptions={booleanFieldOptions}
            textFieldOptions={textFieldOptions}
            hideLabel={config.hideLabel}
            onChange={options.onChange}
          />
        </div>
      );
    },
    entityFieldSelectorRenderer: (config, containerClassName) => {
      const root = config.fieldPath;
      const fieldUI = options.definition.ui.fields?.[root];
      const access = getFieldAccessLevel(options.fieldAccess, root);
      if (!isFieldVisible(fieldUI, options.canRead, access)) {
        return null;
      }
      const fieldMeta = options.definition.fields[root];
      return (
        <EntityFieldSelector
          entityName={options.entityName}
          config={config}
          value={options.values[root]}
          label={fieldUI?.label ?? formatFieldLabel(root, options.definition)}
          required={fieldMeta?.required}
          error={options.errors[root]}
          readOnly={!isFieldEditable(fieldUI, canWrite, access)}
          containerClassName={formComponentContainerClassName(
            containerClassName,
          )}
          listScrollContained={options.wizardStepContent === true}
          onChange={options.onChange}
        />
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
          <Button
            type="submit"
            form={ENTITY_FORM_ID}
            loading={options.isSubmitting}
          >
            {options.saveLabel}
          </Button>
          <Button type="button" variant="outline" onClick={options.onCancel}>
            {options.cancelLabel}
          </Button>
        </div>
      ),
    resolveImage: layoutImageContext.resolveImage,
    isImagePresent: layoutImageContext.isImagePresent,
    lucideIconRenderer: (config) => <LayoutLucideIcon config={config} />,
    ...createComponentClickContextHelpers({
      item: clickItem,
      entityName: options.entityName,
      definition: options.definition,
      resolveField,
      getDefinition,
      navigate: options.navigate,
      navigateComponentClick: options.navigateComponentClick,
    }),
  };
}
