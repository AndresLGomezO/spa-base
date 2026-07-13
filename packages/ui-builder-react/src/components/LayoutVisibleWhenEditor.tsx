import type {
  FieldDateDisplayFormat,
  LayoutVisibleWhen,
} from "@repo/ui-builder-core";

import type { FieldDescriptor } from "../adapters/entity-card-view-adapter.js";
import {
  LayoutConditionsEditor,
  type LayoutConditionsEditorLabels,
} from "./LayoutConditionsEditor.js";

export type LayoutVisibleWhenEditorLabels = LayoutConditionsEditorLabels;

export interface LayoutVisibleWhenEditorProps {
  readonly visibleWhen?: LayoutVisibleWhen;
  readonly labels: LayoutVisibleWhenEditorLabels;
  readonly onChange: (visibleWhen: LayoutVisibleWhen | undefined) => void;
  readonly fieldOptions?: readonly FieldDescriptor[];
  readonly defaultCompareFieldPath?: string;
  readonly defaultCompareFieldDateFormat?: FieldDateDisplayFormat;
  readonly className?: string;
}

/** @deprecated Prefer composing LayoutConditionsEditor directly. */
export const DASHBOARD_DATE_FILTER_CURRENT_PERIOD = [
  {
    conditionKind: "dashboardDateFilter",
    matchValue: "currentPeriod",
  },
] as const satisfies LayoutVisibleWhen;

export function LayoutVisibleWhenEditor({
  visibleWhen,
  labels,
  onChange,
  fieldOptions,
  defaultCompareFieldPath,
  defaultCompareFieldDateFormat,
  className,
}: LayoutVisibleWhenEditorProps) {
  return (
    <LayoutConditionsEditor
      conditions={visibleWhen}
      labels={labels}
      onChange={onChange}
      fieldOptions={fieldOptions}
      defaultCompareFieldPath={defaultCompareFieldPath}
      defaultCompareFieldDateFormat={defaultCompareFieldDateFormat}
      className={className}
      defaultOpen={Boolean(visibleWhen && visibleWhen.length > 0)}
    />
  );
}
