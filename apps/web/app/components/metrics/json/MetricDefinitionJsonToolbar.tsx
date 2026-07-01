import { useMemo } from "react";
import type { MetricDefinitionFormData } from "@repo/metrics-engine/browser";

import { MetricDefinitionJsonImportDialog } from "./MetricDefinitionJsonImportDialog.js";
import { MetricDefinitionJsonViewDialog } from "./MetricDefinitionJsonViewDialog.js";
import type { MetricDefinitionFormJsonLabels } from "./metric-definition-json-labels.js";
import {
  exportMetricFormState,
  importMetricFormState,
  type MetricFormStateExportInput,
  type MetricFormStateImportResult,
} from "./export-metric-form-state.js";

interface MetricDefinitionJsonToolbarProps {
  readonly mode: "create" | "edit";
  readonly existingName?: string;
  readonly canApply: boolean;
  readonly formState: MetricFormStateExportInput;
  readonly labels: MetricDefinitionFormJsonLabels;
  readonly onImport: (state: MetricFormStateImportResult) => void;
}

export function MetricDefinitionJsonToolbar({
  mode,
  existingName,
  canApply,
  formState,
  labels,
  onImport,
}: MetricDefinitionJsonToolbarProps) {
  const exportData = useMemo(
    () => exportMetricFormState(formState),
    [formState],
  );

  return (
    <div className="flex flex-wrap gap-2">
      <MetricDefinitionJsonViewDialog data={exportData} labels={labels} />
      <MetricDefinitionJsonImportDialog
        mode={mode}
        existingName={existingName}
        canApply={canApply}
        labels={labels}
        onApply={(data: MetricDefinitionFormData) => {
          onImport(importMetricFormState(data));
        }}
      />
    </div>
  );
}
