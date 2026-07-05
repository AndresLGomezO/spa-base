import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createLayoutJsonSkeleton,
  validateLayoutJsonImport,
  type ColumnNode,
  type ComponentRowNode,
  type DesignSurface,
  type FieldPathValidationDefinition,
  type LayoutJsonImportScope,
  type LayoutJsonImportValidationResult,
  type UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Modal, Text } from "@repo/ui";

export interface LayoutJsonImportLabels {
  readonly trigger: string;
  readonly titleRoot: string;
  readonly titleColumn?: string;
  readonly titleComponentRow: string;
  readonly titleNestedRow: string;
  readonly titleInsertableRow: string;
  readonly pasteLabel: string;
  readonly uploadLabel: string;
  readonly skeletonTitle: string;
  readonly skeletonShow: string;
  readonly skeletonHide: string;
  readonly valid: string;
  readonly invalid: string;
  readonly apply: string;
  readonly cancel: string;
  readonly readOnlyHint: string;
  readonly viewTrigger: string;
  readonly viewTitleRoot: string;
  readonly viewTitleColumn?: string;
  readonly viewTitleComponentRow: string;
  readonly viewTitleNestedRow: string;
  readonly viewDescription: string;
  readonly viewCopy: string;
  readonly viewCopied: string;
}

export interface LayoutJsonImportDialogProps {
  readonly scope: LayoutJsonImportScope;
  readonly designSurface: DesignSurface;
  readonly definition: FieldPathValidationDefinition;
  readonly defaultFieldPath: string;
  readonly canApply: boolean;
  readonly labels: LayoutJsonImportLabels;
  readonly onApply: (
    data: UiLayoutDocument | ColumnNode | ComponentRowNode | ComponentRowNode,
  ) => void;
  readonly referenceData?:
    | UiLayoutDocument
    | ColumnNode
    | ComponentRowNode
    | ComponentRowNode;
  readonly actionsInModalFooter?: boolean;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly renderTrigger?: (options: { open: () => void }) => ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

function titleForScope(
  scope: LayoutJsonImportScope,
  labels: LayoutJsonImportLabels,
): string {
  switch (scope.type) {
    case "layout-document":
      return labels.titleRoot;
    case "column":
      return labels.titleColumn ?? labels.titleNestedRow;
    case "component-row":
      return labels.titleComponentRow;
    case "insertable-row":
      return labels.titleInsertableRow;
  }
}

export function LayoutJsonImportDialog({
  scope,
  designSurface,
  definition,
  defaultFieldPath,
  canApply,
  labels,
  onApply,
  referenceData,
  actionsInModalFooter = false,
  triggerSize = "sm",
  renderTrigger,
  open: openProp,
  onOpenChange,
}: LayoutJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () =>
      createLayoutJsonSkeleton(
        scope,
        designSurface,
        defaultFieldPath,
        referenceData,
      ),
    [scope, designSurface, defaultFieldPath, referenceData],
  );

  const validation = useMemo((): LayoutJsonImportValidationResult => {
    if (jsonText.trim().length === 0) {
      return { ok: false, errors: [] };
    }
    return validateLayoutJsonImport(jsonText, scope, {
      designSurface,
      definition,
      actionsInModalFooter,
    });
  }, [jsonText, scope, designSurface, definition, actionsInModalFooter]);

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
    if (!validation.ok || !validation.data || !canApply) {
      return;
    }
    onApply(validation.data);
    setOpen(false);
  };

  const openDialog = () => setOpen(true);

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: openDialog })
      ) : openProp === undefined ? (
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          onClick={openDialog}
        >
          {labels.trigger}
        </Button>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={titleForScope(scope, labels)}
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
                <>
                  <Text className="text-destructive text-sm">
                    {labels.invalid}
                  </Text>
                  {validation.errors.length > 0 ? (
                    <ul className="text-destructive max-h-40 list-disc overflow-auto pl-5 text-sm">
                      {validation.errors.map((error) => (
                        <li key={`${error.path}:${error.message}`}>
                          {error.path}: {error.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
