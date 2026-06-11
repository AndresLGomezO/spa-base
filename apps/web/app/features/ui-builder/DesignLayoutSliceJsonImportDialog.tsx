import { useEffect, useMemo, useRef, useState } from "react";
import {
  createDesignLayoutSliceSkeleton,
  parseDesignLayoutSliceJson,
  validateDesignLayoutSlice,
  type DesignLayoutSliceData,
  type DesignLayoutSliceValidationResult,
  type DesignLayoutSurface,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { Button, Modal, Text } from "@repo/ui";

import type { DesignLayoutSliceJsonLabels } from "./design-layout-slice-json-labels.js";
import { toValidationEntity } from "./to-validation-entity.js";

interface DesignLayoutSliceJsonImportDialogProps {
  readonly surface: DesignLayoutSurface;
  readonly definition: SerializableEntityDefinition;
  readonly canApply: boolean;
  readonly labels: DesignLayoutSliceJsonLabels;
  readonly onApply: (data: DesignLayoutSliceData) => void;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function DesignLayoutSliceJsonImportDialog({
  surface,
  definition,
  canApply,
  labels,
  onApply,
  triggerSize = "sm",
  open: openProp,
  onOpenChange,
}: DesignLayoutSliceJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const skeleton = useMemo(
    () => createDesignLayoutSliceSkeleton(surface),
    [surface],
  );

  const validation = useMemo((): DesignLayoutSliceValidationResult => {
    if (jsonText.trim().length === 0) {
      return { ok: false, errors: [] };
    }

    const parsed = parseDesignLayoutSliceJson(jsonText, surface);
    if (!parsed.ok) {
      return parsed;
    }

    const entity = toValidationEntity(definition);
    return validateDesignLayoutSlice(
      entity,
      surface,
      parsed.data,
      definition.ui,
    );
  }, [definition, jsonText, surface]);

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
                <Text className="text-sm text-green-600 dark:text-green-400">
                  {labels.valid}
                </Text>
              ) : (
                <>
                  <Text className="text-destructive text-sm">
                    {labels.invalid}
                  </Text>
                  {"errors" in validation && validation.errors.length > 0 ? (
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
