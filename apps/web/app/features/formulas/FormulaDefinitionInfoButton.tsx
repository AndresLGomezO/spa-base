import { useState } from "react";
import { FunctionSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@repo/ui";

import type { FormulaDefinitionRecord } from "../../lib/api-client";
import { FormulaDefinitionSummaryModal } from "./FormulaDefinitionSummaryModal";

interface FormulaDefinitionInfoButtonProps {
  readonly formulaName: string;
  readonly definition?: FormulaDefinitionRecord | null;
}

export function FormulaDefinitionInfoButton({
  formulaName,
  definition,
}: FormulaDefinitionInfoButtonProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  if (formulaName.trim().length === 0) {
    return null;
  }

  return (
    <>
      <IconButton
        type="button"
        size="sm"
        label={t("formulas.summaryModal.viewFormula", { name: formulaName })}
        onClick={() => setOpen(true)}
      >
        <FunctionSquare aria-hidden className="size-4" />
      </IconButton>

      <FormulaDefinitionSummaryModal
        open={open}
        formulaName={formulaName}
        definition={definition}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
