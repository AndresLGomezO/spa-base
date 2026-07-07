import { useMemo } from "react";
import type { EntityDefinitionFormData } from "@repo/dynamic-entities";
import type { JsonActionTriggerLabels } from "@repo/ui";

import { EntityDefinitionJsonImportDialog } from "./EntityDefinitionJsonImportDialog.js";
import { EntityDefinitionJsonViewDialog } from "./EntityDefinitionJsonViewDialog.js";
import type { EntityDefinitionFormJsonLabels } from "./entity-definition-json-labels.js";
import {
  exportEntityFormState,
  importEntityFormState,
  type EntityFormStateExportInput,
  type EntityFormStateImportResult,
} from "./export-entity-form-state.js";

interface EntityDefinitionJsonToolbarProps {
  readonly mode: "create" | "edit";
  readonly existingName?: string;
  readonly canApply: boolean;
  readonly formState: EntityFormStateExportInput;
  readonly labels: EntityDefinitionFormJsonLabels;
  readonly triggerLabels?: JsonActionTriggerLabels;
  readonly onImport: (state: EntityFormStateImportResult) => void;
}

export function EntityDefinitionJsonToolbar({
  mode,
  existingName,
  canApply,
  formState,
  labels,
  triggerLabels,
  onImport,
}: EntityDefinitionJsonToolbarProps) {
  const exportData = useMemo(
    () => exportEntityFormState(formState),
    [formState],
  );

  return (
    <div className="flex flex-wrap gap-2">
      <EntityDefinitionJsonViewDialog
        data={exportData}
        labels={labels}
        triggerLabels={triggerLabels}
      />
      <EntityDefinitionJsonImportDialog
        mode={mode}
        existingName={existingName}
        canApply={canApply}
        labels={labels}
        triggerLabels={triggerLabels}
        onApply={(data: EntityDefinitionFormData) => {
          onImport(importEntityFormState(data));
        }}
      />
    </div>
  );
}
