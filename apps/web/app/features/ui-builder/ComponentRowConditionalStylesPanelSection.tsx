import type { SerializableEntityDefinition } from "@repo/entities";
import type {
  ComponentRowNode,
  DesignSurface,
  UiComponentConfig,
} from "@repo/ui-builder-core";
import {
  entityBoundComponentSupportsConditionalStyles,
  resolveDefaultCompareFieldPath,
  type ConditionalStyleRule,
} from "@repo/ui-builder-core";
import {
  CollapsibleConditionalStylesEditor,
  type CollapsibleConditionalStylesEditorMode,
  type FieldDescriptor,
} from "@repo/ui-builder-react";

import type { ComponentsLayoutBinding } from "../form-designer/form-designer-components-layout.js";
import type { ComponentRowRef } from "../form-designer/form-designer-component-row-ref.js";
import { useConditionalStylesEditorLabels } from "./conditional-styles-editor-labels.js";

function componentShowsConditionalStylesSection(
  config: UiComponentConfig,
  fieldDescriptors: readonly FieldDescriptor[],
): boolean {
  if (config.kind === "wizard-progress") {
    const variant = config.variant ?? "steps";
    return variant === "steps" || variant === "stepper";
  }

  return (
    fieldDescriptors.length > 0 &&
    entityBoundComponentSupportsConditionalStyles(config.kind)
  );
}

function resolveConditionalStylesEditorMode(
  config: UiComponentConfig,
): CollapsibleConditionalStylesEditorMode | null {
  if (config.kind === "badge") {
    return "badge";
  }
  if (config.kind === "wizard-progress") {
    return "wizard-status";
  }
  if (entityBoundComponentSupportsConditionalStyles(config.kind)) {
    return "field";
  }
  return null;
}

function resolveConditionalStylesHint(
  config: UiComponentConfig,
  daysRemainingHint: string,
  defaultHint: string,
): string | undefined {
  if (config.kind === "date" && config.dateDisplayFormat === "daysRemaining") {
    return daysRemainingHint;
  }
  if (config.kind === "badge" || config.kind === "wizard-progress") {
    return undefined;
  }
  return defaultHint;
}

interface ComponentRowConditionalStylesPanelSectionProps {
  readonly row: ComponentRowNode;
  readonly rowRef: ComponentRowRef;
  readonly binding: ComponentsLayoutBinding;
  readonly fieldDescriptors: readonly FieldDescriptor[];
  readonly definition: SerializableEntityDefinition;
  readonly designSurface: DesignSurface;
}

export function ComponentRowConditionalStylesPanelSection({
  row,
  rowRef,
  binding,
  fieldDescriptors,
}: ComponentRowConditionalStylesPanelSectionProps) {
  const labels = useConditionalStylesEditorLabels();

  if (row.type !== "component") {
    return null;
  }

  const config = row.component;
  if (!componentShowsConditionalStylesSection(config, fieldDescriptors)) {
    return null;
  }

  const mode = resolveConditionalStylesEditorMode(config);
  if (!mode) {
    return null;
  }

  const conditionalStyles =
    "conditionalStyles" in config ? (config.conditionalStyles ?? []) : [];
  const defaultCompareFieldPath = resolveDefaultCompareFieldPath(config);

  return (
    <CollapsibleConditionalStylesEditor
      title={labels.title}
      rules={conditionalStyles as ConditionalStyleRule[]}
      mode={mode}
      fieldOptions={fieldDescriptors}
      defaultCompareFieldPath={defaultCompareFieldPath}
      defaultCompareFieldDateFormat={
        config.kind === "date" ? config.dateDisplayFormat : undefined
      }
      hint={resolveConditionalStylesHint(
        config,
        labels.daysRemainingHint,
        labels.defaultHint,
      )}
      daysRemainingHint={labels.daysRemainingHint}
      labels={labels.editor}
      onChange={(rules) =>
        binding.updateComponent(rowRef, {
          ...config,
          conditionalStyles: rules,
        } as UiComponentConfig)
      }
    />
  );
}
