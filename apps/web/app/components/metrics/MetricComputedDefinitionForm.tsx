import type {
  ComputedMetricComputation,
  MetricDefinitionParameter,
  MetricValueDisplayFormat,
} from "@repo/metrics-engine/browser";
import { CollapsibleEditorCard } from "@repo/ui-builder-react";
import { FieldLabel, Text } from "@repo/ui";
import { AdminSelect as Select } from "~/components/admin/AdminSelect";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  EntityQueryDefinitionRecord,
  MetricDefinitionRecord,
} from "../../lib/api-client.js";
import type { MetricDefinitionDraft } from "./metric-definition-draft.js";
import { createDefaultComputedComputation } from "./metric-definition-draft.js";
import { MetricComputationEditor } from "./MetricComputationEditor.js";
import { MetricComputationPreview } from "./MetricComputationPreview.js";
import { MetricParametersEditor } from "./MetricParametersEditor.js";
import { selectClassName } from "./metric-computation-shared.js";

interface MetricComputedDefinitionFormProps {
  readonly draft: Pick<
    MetricDefinitionDraft,
    "parameters" | "computation" | "valueDisplayFormat"
  >;
  readonly onChange: (patch: Partial<MetricDefinitionDraft>) => void;
  readonly allDefinitions: readonly MetricDefinitionRecord[];
  readonly queryDefinitions: readonly EntityQueryDefinitionRecord[];
  readonly readOnly?: boolean;
}

const VALUE_DISPLAY_FORMATS: readonly MetricValueDisplayFormat[] = [
  "number",
  "currency",
  "percent",
];

export function MetricComputedDefinitionForm({
  draft,
  onChange,
  allDefinitions,
  queryDefinitions,
  readOnly = false,
}: MetricComputedDefinitionFormProps) {
  const { t } = useTranslation("common");

  const parameterNames = useMemo(
    () =>
      draft.parameters
        .map((parameter) => parameter.name.trim())
        .filter((name) => name.length > 0),
    [draft.parameters],
  );

  const computation = draft.computation ?? createDefaultComputedComputation();

  function handleParametersChange(
    parameters: readonly MetricDefinitionParameter[],
  ) {
    onChange({ parameters });
  }

  function handleComputationChange(nextComputation: ComputedMetricComputation) {
    onChange({ computation: nextComputation });
  }

  return (
    <div className="space-y-4">
      <CollapsibleEditorCard
        title={t("metrics.computed.sections.parameters", {
          defaultValue: "Parameters",
        })}
        defaultOpen
      >
        <MetricParametersEditor
          parameters={draft.parameters}
          onChange={handleParametersChange}
          readOnly={readOnly}
        />
      </CollapsibleEditorCard>

      <CollapsibleEditorCard
        title={t("metrics.computed.sections.computation", {
          defaultValue: "Computation",
        })}
        defaultOpen
      >
        <MetricComputationEditor
          computation={computation}
          onChange={handleComputationChange}
          parameterNames={parameterNames}
          metricDefinitions={allDefinitions}
          queryDefinitions={queryDefinitions}
          readOnly={readOnly}
        />
      </CollapsibleEditorCard>

      <CollapsibleEditorCard
        title={t("metrics.computed.sections.preview", {
          defaultValue: "Preview",
        })}
        defaultOpen
      >
        <MetricComputationPreview
          parameters={draft.parameters}
          computation={computation}
          metricDefinitions={allDefinitions}
          queryDefinitions={queryDefinitions}
        />
      </CollapsibleEditorCard>

      <CollapsibleEditorCard
        title={t("metrics.computed.sections.display", {
          defaultValue: "Display",
        })}
        defaultOpen
      >
        <div>
          <FieldLabel htmlFor="metric-computed-value-display-format">
            {t("metrics.valueDisplayFormat.label", {
              defaultValue: "Value display format",
            })}
          </FieldLabel>
          <Select
            id="metric-computed-value-display-format"
            className={selectClassName}
            value={draft.valueDisplayFormat}
            disabled={readOnly}
            onChange={(event) =>
              onChange({
                valueDisplayFormat: event.target
                  .value as MetricValueDisplayFormat,
              })
            }
          >
            {VALUE_DISPLAY_FORMATS.map((format) => (
              <option key={format} value={format}>
                {t(`metrics.valueDisplayFormat.${format}`, {
                  defaultValue: format,
                })}
              </option>
            ))}
          </Select>
          <Text className="text-muted-foreground mt-2 text-xs">
            {t("metrics.computed.displayHint", {
              defaultValue:
                "Percent change and ratio computations often use the percent format.",
            })}
          </Text>
        </div>
      </CollapsibleEditorCard>
    </div>
  );
}
