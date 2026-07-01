import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeCatalogReplacePlan,
  computeCategoryReplacePlan,
  createEntityDefinitionsCatalogEnvelope,
  validateEntityDefinitionsCatalogImport,
  type EntityCategoryLike,
  type EntityDefinitionRecord,
  type EntityDefinitionsCatalogEnvelope,
} from "@repo/dynamic-entities";
import { Button, Modal, Text } from "@repo/ui";

import type { EntityCategoryRecord as ApiEntityCategoryRecord } from "../../../lib/api-client";
import type { EntityDefinitionRecord as ApiEntityDefinitionRecord } from "../../../lib/api-client";
import { JsonImportErrors } from "./JsonImportErrors.js";
import type { EntityDefinitionsCatalogJsonLabels } from "./entity-definition-json-labels.js";

interface EntityDefinitionsCatalogJsonImportDialogProps {
  readonly existingItems: readonly ApiEntityDefinitionRecord[];
  readonly existingCategories?: readonly ApiEntityCategoryRecord[];
  readonly canApply: boolean;
  readonly labels: EntityDefinitionsCatalogJsonLabels;
  readonly onApply: (catalog: EntityDefinitionsCatalogEnvelope) => void;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function EntityDefinitionsCatalogJsonImportDialog({
  existingItems,
  existingCategories = [],
  canApply,
  labels,
  onApply,
  triggerSize = "sm",
  open: openProp,
  onOpenChange,
}: EntityDefinitionsCatalogJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () =>
      JSON.stringify(
        createEntityDefinitionsCatalogEnvelope(
          [
            {
              id: "example",
              tenantId: "tenant",
              name: "loan",
              label: "Loans",
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              fields: [{ name: "amount", type: "number", required: true }],
            },
          ],
          {
            categories: [
              {
                id: "cat_finance",
                name: "Finance",
                icon: "Wallet",
                order: 0,
              },
            ],
          },
        ),
        null,
        2,
      ),
    [],
  );

  const validation = useMemo(() => {
    if (jsonText.trim().length === 0) {
      return { ok: false as const, errors: [] as const };
    }
    return validateEntityDefinitionsCatalogImport(jsonText);
  }, [jsonText]);

  const replacePlan = useMemo(() => {
    if (!validation.ok) {
      return null;
    }
    return computeCatalogReplacePlan({
      existing: existingItems as readonly EntityDefinitionRecord[],
      imported: validation.data.entityDefinitions,
    });
  }, [existingItems, validation]);

  const categoryReplacePlan = useMemo(() => {
    if (!validation.ok || validation.data.entityCategories === undefined) {
      return null;
    }
    return computeCategoryReplacePlan({
      existing: existingCategories as readonly EntityCategoryLike[],
      imported: validation.data.entityCategories,
    });
  }, [existingCategories, validation]);

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
                  {categoryReplacePlan ? (
                    <Text className="text-muted-foreground text-sm">
                      {formatReplaceSummary(
                        categoryReplacePlan.counts,
                        labels.categoryReplaceSummary,
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
        {categoryReplacePlan ? (
          <Text className="mt-1 text-sm">
            {formatReplaceSummary(
              categoryReplacePlan.counts,
              labels.categoryReplaceSummary,
            )}
          </Text>
        ) : null}
      </Modal>
    </>
  );
}
