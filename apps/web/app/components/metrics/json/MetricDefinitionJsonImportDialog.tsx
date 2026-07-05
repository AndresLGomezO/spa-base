import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMetricDefinitionEnvelope,
  validateMetricDefinitionImport,
  type MetricDefinitionFormData,
} from "@repo/metrics-engine/browser";
import { Button, Modal, Text } from "@repo/ui";

import { JsonImportErrors } from "../../data-models/json/JsonImportErrors.js";
import type { MetricDefinitionFormJsonLabels } from "./metric-definition-json-labels.js";

interface MetricDefinitionJsonImportDialogProps {
  readonly mode: "create" | "edit";
  readonly existingName?: string;
  readonly canApply: boolean;
  readonly labels: MetricDefinitionFormJsonLabels;
  readonly onApply: (data: MetricDefinitionFormData) => void;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function MetricDefinitionJsonImportDialog({
  mode,
  existingName,
  canApply,
  labels,
  onApply,
  triggerSize = "sm",
  open: openProp,
  onOpenChange,
}: MetricDefinitionJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () =>
      JSON.stringify(
        createMetricDefinitionEnvelope({
          name: "Income MoM %",
          description: "Month-over-month percent change for income.",
          sourceModel: "transaction",
          computationMode: "computed",
          valueDisplayFormat: "percent",
          parameters: [
            {
              name: "currentPeriod",
              valueType: "dateBucket",
              granularity: "month",
            },
            {
              name: "comparisonPeriod",
              valueType: "dateBucket",
              granularity: "month",
              deriveFrom: {
                parameter: "currentPeriod",
                shift: { unit: "month", offset: -1 },
              },
            },
          ],
          computation: {
            type: "percentChange",
            current: {
              type: "metricRef",
              metricDefinitionId: "Income by Month",
              parameterMap: { date: "currentPeriod" },
            },
            baseline: {
              type: "metricRef",
              metricDefinitionId: "Income by Month",
              parameterMap: { date: "comparisonPeriod" },
            },
          },
          filters: [],
          groupBy: [],
          dimensions: [],
          dateFieldGranularity: {},
          aggregations: [{ operation: "COUNT" }],
          version: 1,
          schemaVersionDependency: 0,
          fieldsDependency: [],
          status: "ACTIVE",
        }),
        null,
        2,
      ),
    [],
  );

  const validation = useMemo(() => {
    if (jsonText.trim().length === 0) {
      return { ok: false as const, errors: [] as const };
    }

    const parsed = validateMetricDefinitionImport(jsonText);
    if (!parsed.ok) {
      return parsed;
    }

    if (
      mode === "edit" &&
      existingName &&
      parsed.data.name.trim() !== existingName
    ) {
      return {
        ok: false as const,
        errors: [
          {
            path: "data.name",
            message: labels.nameChangeError,
          },
        ],
      };
    }

    return parsed;
  }, [existingName, jsonText, labels.nameChangeError, mode]);

  useEffect(() => {
    if (!open) {
      setJsonText("");
      setShowSkeleton(true);
    }
  }, [open]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setJsonText(text);
    event.target.value = "";
  };

  const handleApply = () => {
    if (!validation.ok || !canApply) {
      return;
    }
    onApply(validation.data);
    setOpen(false);
  };

  const importDescription =
    mode === "create"
      ? labels.importDescriptionCreate
      : labels.importDescriptionEdit;

  return (
    <>
      {openProp === undefined ? (
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          onClick={() => setOpen(true)}
        >
          {labels.importTrigger}
        </Button>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.importTitle}
        size="xl"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              disabled={!validation.ok || !canApply}
              onClick={handleApply}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!canApply ? (
            <Text className="text-muted-foreground text-sm">
              {labels.readOnlyHint}
            </Text>
          ) : null}

          <Text className="text-muted-foreground text-sm">
            {importDescription}
          </Text>

          <div className="flex flex-col gap-2">
            <Text className="text-sm font-medium">{labels.pasteLabel}</Text>
            <textarea
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[220px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {labels.uploadLabel}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Text className="text-sm font-medium">
                {labels.skeletonTitle}
              </Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSkeleton((current) => !current)}
              >
                {showSkeleton ? labels.skeletonHide : labels.skeletonShow}
              </Button>
            </div>
            {showSkeleton ? (
              <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-xs">
                {skeleton}
              </pre>
            ) : null}
          </div>

          {jsonText.trim().length > 0 ? (
            <div className="flex flex-col gap-2">
              {validation.ok ? (
                <Text className="text-sm text-green-600 dark:text-green-400">
                  {labels.valid}
                </Text>
              ) : (
                <JsonImportErrors
                  errors={validation.errors}
                  invalidLabel={labels.invalid}
                />
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
