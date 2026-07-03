import { useMemo } from "react";
import type { FormulaDefinitionFormData } from "@repo/formula-definitions/browser";

import { FormulaDefinitionJsonImportDialog } from "./FormulaDefinitionJsonImportDialog.js";
import { FormulaDefinitionJsonViewDialog } from "./FormulaDefinitionJsonViewDialog.js";
import type { FormulaDefinitionFormJsonLabels } from "./formula-definition-json-labels.js";

interface FormulaDefinitionJsonToolbarProps {
  readonly existingName: string;
  readonly canApply: boolean;
  readonly formData: FormulaDefinitionFormData;
  readonly labels: FormulaDefinitionFormJsonLabels;
  readonly onImport: (data: FormulaDefinitionFormData) => void;
}

export function FormulaDefinitionJsonToolbar({
  existingName,
  canApply,
  formData,
  labels,
  onImport,
}: FormulaDefinitionJsonToolbarProps) {
  const exportData = useMemo(() => formData, [formData]);

  return (
    <div className="flex flex-wrap gap-2">
      <FormulaDefinitionJsonViewDialog data={exportData} labels={labels} />
      <FormulaDefinitionJsonImportDialog
        existingName={existingName}
        canApply={canApply}
        labels={labels}
        onApply={onImport}
      />
    </div>
  );
}
