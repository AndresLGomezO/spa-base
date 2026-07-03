import { useMemo } from "react";
import type { DataHookDefinitionFormData } from "@repo/hooks/browser";

import { DataHookDefinitionJsonImportDialog } from "./DataHookDefinitionJsonImportDialog.js";
import { DataHookDefinitionJsonViewDialog } from "./DataHookDefinitionJsonViewDialog.js";
import type { DataHookDefinitionFormJsonLabels } from "./data-hook-definition-json-labels.js";
import {
  exportDataHookFormState,
  importDataHookFormState,
  type DataHookFormStateExportInput,
  type DataHookFormStateImportResult,
} from "./export-data-hook-form-state.js";

interface DataHookDefinitionJsonToolbarProps {
  readonly existingName: string;
  readonly existingEntity: string;
  readonly canApply: boolean;
  readonly formState: DataHookFormStateExportInput;
  readonly labels: DataHookDefinitionFormJsonLabels;
  readonly onImport: (state: DataHookFormStateImportResult) => void;
}

export function DataHookDefinitionJsonToolbar({
  existingName,
  existingEntity,
  canApply,
  formState,
  labels,
  onImport,
}: DataHookDefinitionJsonToolbarProps) {
  const exportData = useMemo(
    () => exportDataHookFormState(formState),
    [formState],
  );

  return (
    <div className="flex flex-wrap gap-2">
      <DataHookDefinitionJsonViewDialog data={exportData} labels={labels} />
      <DataHookDefinitionJsonImportDialog
        existingName={existingName}
        existingEntity={existingEntity}
        canApply={canApply}
        labels={labels}
        onApply={(data: DataHookDefinitionFormData) => {
          onImport(importDataHookFormState(data));
        }}
      />
    </div>
  );
}
