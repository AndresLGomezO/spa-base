import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@repo/ui";
import { useTranslation } from "react-i18next";

import {
  listFormulaDefinitions,
  type FormulaDefinitionRecord,
} from "../../lib/api-client";
import { FormulaDefinitionSummaryContent } from "./FormulaDefinitionSummaryContent";

interface FormulaDefinitionSummaryModalProps {
  readonly open: boolean;
  readonly formulaName: string;
  readonly definition?: FormulaDefinitionRecord | null;
  readonly onClose: () => void;
}

export function FormulaDefinitionSummaryModal({
  open,
  formulaName,
  definition: initialDefinition,
  onClose,
}: FormulaDefinitionSummaryModalProps) {
  const { t } = useTranslation("common");
  const [navigationStack, setNavigationStack] = useState<readonly string[]>([
    formulaName,
  ]);
  const [catalog, setCatalog] = useState<readonly FormulaDefinitionRecord[]>(
    [],
  );
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setNavigationStack([formulaName]);
  }, [open, formulaName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsLoadingCatalog(true);
    void listFormulaDefinitions()
      .then((result) => {
        if (!cancelled) {
          setCatalog(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCatalog(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const currentFormulaName =
    navigationStack[navigationStack.length - 1] ?? formulaName;

  const preloadedDefinition = useMemo(() => {
    if (currentFormulaName !== formulaName) {
      return null;
    }
    return initialDefinition ?? null;
  }, [currentFormulaName, formulaName, initialDefinition]);

  function navigateToFormula(name: string) {
    setNavigationStack((previous) => {
      const existingIndex = previous.indexOf(name);
      if (existingIndex >= 0) {
        return previous.slice(0, existingIndex + 1);
      }
      return [...previous, name];
    });
  }

  function navigateToStackIndex(index: number) {
    setNavigationStack((previous) => previous.slice(0, index + 1));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={currentFormulaName}
      size="xl"
      scrollable
      footer={
        <Button type="button" onClick={onClose}>
          {t("formulas.summaryModal.close")}
        </Button>
      }
    >
      <FormulaDefinitionSummaryContent
        formulaName={currentFormulaName}
        definition={preloadedDefinition}
        catalog={catalog}
        isLoadingCatalog={isLoadingCatalog}
        navigationStack={navigationStack}
        onNavigateToFormula={navigateToFormula}
        onNavigateToStackIndex={navigateToStackIndex}
      />
    </Modal>
  );
}
