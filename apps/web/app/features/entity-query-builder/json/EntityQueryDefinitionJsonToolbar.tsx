import { useMemo } from "react";
import type { EntityQueryDefinitionFormData } from "@repo/entity-queries/browser";

import { EntityQueryDefinitionJsonImportDialog } from "./EntityQueryDefinitionJsonImportDialog.js";
import { EntityQueryDefinitionJsonViewDialog } from "./EntityQueryDefinitionJsonViewDialog.js";
import type { EntityQueryDefinitionFormJsonLabels } from "./entity-query-definition-json-labels.js";
import {
  exportEntityQueryFormState,
  importEntityQueryFormState,
  type EntityQueryFormStateExportInput,
  type EntityQueryFormStateImportResult,
} from "./export-entity-query-form-state.js";

interface EntityQueryDefinitionJsonToolbarProps {
  readonly existingName: string;
  readonly existingSourceEntity: string;
  readonly canApply: boolean;
  readonly formState: EntityQueryFormStateExportInput;
  readonly labels: EntityQueryDefinitionFormJsonLabels;
  readonly onImport: (state: EntityQueryFormStateImportResult) => void;
}

export function EntityQueryDefinitionJsonToolbar({
  existingName,
  existingSourceEntity,
  canApply,
  formState,
  labels,
  onImport,
}: EntityQueryDefinitionJsonToolbarProps) {
  const exportData = useMemo(
    () => exportEntityQueryFormState(formState),
    [formState],
  );

  return (
    <div className="flex flex-wrap gap-2">
      <EntityQueryDefinitionJsonViewDialog data={exportData} labels={labels} />
      <EntityQueryDefinitionJsonImportDialog
        existingName={existingName}
        existingSourceEntity={existingSourceEntity}
        canApply={canApply}
        labels={labels}
        onApply={(data: EntityQueryDefinitionFormData) => {
          onImport(importEntityQueryFormState(data));
        }}
      />
    </div>
  );
}
