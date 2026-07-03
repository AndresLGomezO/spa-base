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

interface FormulaDefinitionSummaryContentProps {
  readonly formulaName: string;
  readonly definition?: FormulaDefinitionRecord | null;
  readonly catalog: readonly FormulaDefinitionRecord[];
  readonly isLoadingCatalog: boolean;
  readonly navigationStack: readonly string[];
  readonly onNavigateToFormula: (formulaName: string) => void;
  readonly onNavigateToStackIndex: (index: number) => void;
}

export function FormulaDefinitionSummaryContent({
  formulaName,
  definition: preloadedDefinition,
  catalog,
  isLoadingCatalog,
  navigationStack,
  onNavigateToFormula,
  onNavigateToStackIndex,
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

  const descriptor = getFormulaPreviewDescriptor(formulaName);
  const summaryText = descriptor
    ? previewContext.t(descriptor.summaryKey)
    : humanizeFormulaName(formulaName);
  const detailBullets = enrichFormulaDetailBullets(formulaName, previewContext);

  if (isLoadingCatalog && !definition) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("formulas.summaryModal.loading")}
      </Text>
    );
  }

  if (!definition) {
    return (
      <div className="space-y-5">
        <FormulaDefinitionSummaryNavigation
          navigationStack={navigationStack}
          onNavigateToStackIndex={onNavigateToStackIndex}
        />
        <Text className="text-muted-foreground text-sm">
          {t("formulas.summaryModal.notFound", { name: formulaName })}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormulaDefinitionSummaryNavigation
        navigationStack={navigationStack}
        onNavigateToStackIndex={onNavigateToStackIndex}
      />

      <div className="space-y-1">
        {definition.description ? (
          <Text className="text-muted-foreground text-sm">
            {definition.description}
          </Text>
        ) : null}
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            {t("formulas.summaryModal.source")}:{" "}
            {definition.source === "platform"
              ? t("formulas.summaryModal.sourcePlatform")
              : t("formulas.summaryModal.sourceTenant")}
          </span>
          <span>
            {t("formulas.summaryModal.status")}:{" "}
            {definition.enabled
              ? t("formulas.settings.enabled")
              : t("formulas.settings.disabled")}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("formulas.summaryModal.sections.summary")}
        </Text>
        <Text className="text-foreground text-sm">{summaryText}</Text>
        {detailBullets.length > 0 ? (
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
            {detailBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {descriptor?.widgets ? (
          <HookPreviewWidgets widgets={descriptor.widgets} mode="details" />
        ) : null}
      </div>

      {definition.inputs.length > 0 ? (
        <div className="space-y-2">
          <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("formulas.summaryModal.sections.inputs")}
          </Text>
          <ul className="space-y-2">
            {definition.inputs.map((input) => (
              <li
                key={input.name}
                className="border-border rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium">{input.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {input.required
                      ? t("formulas.summaryModal.required")
                      : t("formulas.summaryModal.optional")}
                  </span>
                </div>
                {input.description ? (
                  <Text className="text-muted-foreground mt-1 text-xs">
                    {input.description}
                  </Text>
                ) : null}
                <Text className="text-muted-foreground mt-1 font-mono text-xs">
                  {t("formulas.summaryModal.example")}:{" "}
                  {formatFormulaExampleValue(exampleInputs[input.name] ?? null)}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("formulas.summaryModal.sections.output")}
        </Text>
        <div className="border-border rounded-md border px-3 py-2 text-sm">
          {exampleOutput?.output ? (
            <pre className="bg-muted overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
              {exampleOutput.output}
            </pre>
          ) : (
            <Text className="text-muted-foreground text-xs">
              {exampleOutput?.error ??
                t("formulas.summaryModal.outputUnavailable")}
            </Text>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Text className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
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
  );
}
