import { useMemo } from "react";
import type { CustomViewDefinitionFormData } from "@repo/custom-views/browser";

import { CustomViewDefinitionJsonImportDialog } from "./CustomViewDefinitionJsonImportDialog.js";
import { CustomViewDefinitionJsonViewDialog } from "./CustomViewDefinitionJsonViewDialog.js";
import type { CustomViewDefinitionFormJsonLabels } from "./custom-view-definition-json-labels.js";
import {
  exportCustomViewFormState,
  importCustomViewFormState,
  type CustomViewFormStateExportInput,
  type CustomViewFormStateImportResult,
} from "./export-custom-view-form-state.js";

interface CustomViewDefinitionJsonToolbarProps {
  readonly mode: "create" | "edit";
  readonly existingViewId?: string;
  readonly existingQueryName?: string;
  readonly canApply: boolean;
  readonly formState: CustomViewFormStateExportInput;
  readonly labels: CustomViewDefinitionFormJsonLabels;
  readonly onImport: (state: CustomViewFormStateImportResult) => void;
}

export function CustomViewDefinitionJsonToolbar({
  mode,
  existingViewId,
  existingQueryName,
  canApply,
  formState,
  labels,
  onImport,
}: CustomViewDefinitionJsonToolbarProps) {
  const exportData = useMemo(
    () => exportCustomViewFormState(formState),
    [formState],
  );

  return (
    <div className="flex flex-wrap gap-2">
      <CustomViewDefinitionJsonViewDialog data={exportData} labels={labels} />
      <CustomViewDefinitionJsonImportDialog
        mode={mode}
        existingViewId={existingViewId}
        existingQueryName={existingQueryName}
        canApply={canApply}
        labels={labels}
        onApply={(data: CustomViewDefinitionFormData) => {
          onImport(importCustomViewFormState(data));
        }}
      />
    </div>
  );
}
