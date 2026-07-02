import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeDataHooksCatalogReplacePlan,
  createDataHooksCatalogEnvelope,
  validateDataHooksCatalogImport,
  type DataHookDefinition,
  type DataHooksCatalogEnvelope,
} from "@repo/hooks/browser";
import { Button, Modal, Text } from "@repo/ui";

import type { DataHookDefinitionRecord } from "../../../lib/api-client";
import { JsonImportErrors } from "../../../components/data-models/json/JsonImportErrors.js";
import type { DataHooksCatalogJsonLabels } from "./data-hook-definition-json-labels.js";

interface DataHooksCatalogJsonImportDialogProps {
  readonly existingItems: readonly DataHookDefinitionRecord[];
  readonly canApply: boolean;
  readonly labels: DataHooksCatalogJsonLabels;
  readonly onApply: (catalog: DataHooksCatalogEnvelope) => void;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly importDisabled?: boolean;
}

export function DataHooksCatalogJsonImportDialog({
  existingItems,
  canApply,
  labels,
  onApply,
  triggerSize = "sm",
  importDisabled = false,
}: DataHooksCatalogJsonImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () =>
      JSON.stringify(
        createDataHooksCatalogEnvelope([
          {
            id: "hook_example",
            tenantId: "tenant",
            name: "Set status",
            entity: "loan",
            phase: "before",
            trigger: { operation: "create" },
            condition: null,
            actions: [
              {
                type: "setField",
                field: "status",
                value: { kind: "literal", value: "Pending" },
              },
            ],
            enabled: true,
            order: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as DataHookDefinition,
        ]),
        null,
        2,
      ),
    [],
  );

  const validation = useMemo(() => {
    if (jsonText.trim().length === 0) {
      return { ok: false as const, errors: [] as const };
    }
    return validateDataHooksCatalogImport(jsonText);
  }, [jsonText]);

  const replacePlan = useMemo(() => {
    if (!validation.ok) {
      return null;
    }
    return computeDataHooksCatalogReplacePlan({
      existing: existingItems as readonly DataHookDefinition[],
      imported: validation.data.dataHooks,
    });
  }, [existingItems, validation]);

  const formatReplaceSummary = (
    counts: {
      readonly created: number;
      readonly updated: number;
      readonly deleted: number;
    },
    template: string,
  ) =>
    template
      .replace("{{created}}", String(counts.created))
      .replace("{{updated}}", String(counts.updated))
      .replace("{{deleted}}", String(counts.deleted));

  useEffect(() => {
    if (!open) {
      setJsonText("");
      setShowSkeleton(true);
      setConfirmOpen(false);
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

  const handleApplyClick = () => {
    if (!validation.ok || !canApply) {
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmApply = () => {
    if (!validation.ok || !canApply) {
      return;
    }
    onApply(validation.data);
    setConfirmOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        disabled={importDisabled}
        onClick={() => setOpen(true)}
      >
        {labels.importTrigger}
      </Button>

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
              onClick={handleApplyClick}
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
            {labels.importDescription}
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
                <>
                  <Text className="text-sm text-green-600 dark:text-green-400">
                    {labels.valid}
                  </Text>
                  {replacePlan ? (
                    <Text className="text-muted-foreground text-sm">
                      {formatReplaceSummary(
                        replacePlan.counts,
                        labels.replaceSummary,
                      )}
                    </Text>
                  ) : null}
                </>
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

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={labels.confirmTitle}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {labels.cancel}
            </Button>
            <Button type="button" onClick={handleConfirmApply}>
              {labels.confirmAction}
            </Button>
          </>
        }
      >
        <Text className="text-muted-foreground text-sm">
          {labels.confirmDescription}
        </Text>
        {replacePlan ? (
          <Text className="mt-3 text-sm">
            {formatReplaceSummary(replacePlan.counts, labels.replaceSummary)}
          </Text>
        ) : null}
      </Modal>
    </>
  );
}
