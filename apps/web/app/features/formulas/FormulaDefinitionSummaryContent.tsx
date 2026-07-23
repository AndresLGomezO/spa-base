import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@repo/ui";

import { enrichFormulaDetailBullets } from "../data-hooks/preview/hook-preview-actions";
import {
  getFormulaPreviewDescriptor,
  humanizeFormulaName,
} from "../data-hooks/preview/hook-preview-formula-catalog";
import { HookPreviewWidgets } from "../data-hooks/preview/HookPreviewWidgets";
import type { HookPreviewBuildContext } from "../data-hooks/preview/hook-preview-types";
import type { FormulaDefinitionRecord } from "../../lib/api-client";
import {
  buildFormulaExampleInputs,
  evaluateFormulaExampleOutput,
  formatFormulaExampleValue,
} from "./formula-summary-example";
import { FormulaDefinitionSummaryNavigation } from "./FormulaDefinitionSummaryNavigation";
import { FormulaExpressionInteractivePreview } from "./FormulaExpressionInteractivePreview";
import { buildFormulaPreviewModel } from "./preview/build-formula-preview-model";
import { FormulaPreviewFlow } from "./preview/FormulaPreviewFlow";
import type {
  FormulaPreviewBuildContext,
  FormulaSummaryMode,
} from "./preview/formula-preview-types";

export type { FormulaSummaryMode };

interface FormulaDefinitionSummaryContentProps {
  readonly formulaName: string;
  readonly definition?: FormulaDefinitionRecord | null;
  readonly catalog: readonly FormulaDefinitionRecord[];
  readonly isLoadingCatalog: boolean;
  readonly navigationStack: readonly string[];
  readonly onNavigateToFormula: (formulaName: string) => void;
  readonly onNavigateToStackIndex: (index: number) => void;
  readonly mode?: FormulaSummaryMode;
  readonly showNavigation?: boolean;
}

export function FormulaDefinitionSummaryContent({
  formulaName,
  definition: preloadedDefinition,
  catalog,
  isLoadingCatalog,
  navigationStack,
  onNavigateToFormula,
  onNavigateToStackIndex,
  mode = "overview",
  showNavigation = true,
}: FormulaDefinitionSummaryContentProps) {
  const { t } = useTranslation("common");

  const catalogNames = useMemo(
    () => new Set(catalog.map((entry) => entry.name)),
    [catalog],
  );

  const definition = useMemo(() => {
    if (preloadedDefinition) {
      return preloadedDefinition;
    }
    return catalog.find((entry) => entry.name === formulaName) ?? null;
  }, [catalog, formulaName, preloadedDefinition]);

  const resolverCatalog = useMemo(() => {
    if (catalog.length > 0) {
      return catalog;
    }
    return definition ? [definition] : [];
  }, [catalog, definition]);

  const exampleInputs = useMemo(
    () => (definition ? buildFormulaExampleInputs(definition) : {}),
    [definition],
  );

  const exampleOutput = useMemo(() => {
    if (!definition || resolverCatalog.length === 0) {
      return null;
    }
    return evaluateFormulaExampleOutput(definition, resolverCatalog);
  }, [definition, resolverCatalog]);

  const previewContext = useMemo(
    (): HookPreviewBuildContext => ({
      entityName: "",
      entityLabel: (name) => name,
      fieldLabel: (_entityName, fieldPath) => fieldPath,
      t: (key, options) => String(t(key as never, options as never)),
    }),
    [t],
  );

  const formulaPreviewContext = useMemo(
    (): FormulaPreviewBuildContext => ({
      t: (key, options) => String(t(key as never, options as never)),
    }),
    [t],
  );

  const descriptor = getFormulaPreviewDescriptor(formulaName);
  const summaryText = descriptor
    ? previewContext.t(descriptor.summaryKey)
    : humanizeFormulaName(formulaName);
  const detailBullets = enrichFormulaDetailBullets(formulaName, previewContext);

  const model = useMemo(() => {
    if (!definition) {
      return null;
    }
    const formattedInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(exampleInputs)) {
      formattedInputs[key] = formatFormulaExampleValue(value);
    }
    return buildFormulaPreviewModel(
      {
        definition,
        summaryText,
        detailBullets,
        exampleInputs: formattedInputs,
        exampleOutput: exampleOutput?.output ?? null,
        exampleOutputError: exampleOutput?.error ?? null,
      },
      formulaPreviewContext,
    );
  }, [
    definition,
    detailBullets,
    exampleInputs,
    exampleOutput?.error,
    exampleOutput?.output,
    formulaPreviewContext,
    summaryText,
  ]);

  if (isLoadingCatalog && !definition) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formulas.summaryModal.loading")}
      </Text>
    );
  }

  if (!definition || !model) {
    return (
      <div className="space-y-5">
        {showNavigation ? (
          <FormulaDefinitionSummaryNavigation
            navigationStack={navigationStack}
            onNavigateToStackIndex={onNavigateToStackIndex}
          />
        ) : null}
        <Text className="text-muted-foreground text-sm">
          {t("formulas.summaryModal.notFound", { name: formulaName })}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showNavigation ? (
        <FormulaDefinitionSummaryNavigation
          navigationStack={navigationStack}
          onNavigateToStackIndex={onNavigateToStackIndex}
        />
      ) : null}

      {mode === "overview" || mode === "details" ? (
        <>
          <FormulaPreviewFlow model={model} mode={mode} />
          {descriptor?.widgets ? (
            <HookPreviewWidgets widgets={descriptor.widgets} mode={mode} />
          ) : null}
        </>
      ) : null}

      {mode === "advanced" ? (
        <div className="space-y-3">
          <FormulaPreviewFlow model={model} mode="overview" />
          <div className="border-border bg-card space-y-2 rounded-lg border p-3 shadow-sm">
            <Text className="text-foreground text-sm font-semibold">
              {t("formulas.summaryModal.sections.expression")}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {t("formulas.summaryModal.nestedFormulaHint")}
            </Text>
            <FormulaExpressionInteractivePreview
              value={definition.body}
              catalogNames={catalogNames}
              onFormulaClick={onNavigateToFormula}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
