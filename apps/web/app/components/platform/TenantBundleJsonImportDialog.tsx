import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  validateTenantBundleImport,
  type TenantBundleExportDocument,
} from "@repo/tenant-bundle/browser";
import {
  Button,
  JsonImportTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import type { TenantBundleJsonLabels } from "./tenant-bundle-json-labels";

interface TenantBundleJsonImportDialogProps {
  readonly labels: TenantBundleJsonLabels;
  readonly onApply: (bundle: TenantBundleExportDocument) => void;
  readonly triggerLabels?: JsonActionTriggerLabels;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function TenantBundleJsonImportDialog({
  labels,
  onApply,
  triggerLabels,
  open: openProp,
  onOpenChange,
}: TenantBundleJsonImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [jsonText, setJsonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(
    () => validateTenantBundleImport(jsonText),
    [jsonText],
  );

  useEffect(() => {
    if (!open) {
      setJsonText("");
    }
  }, [open]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setJsonText(text);
    event.target.value = "";
  };

  const handleApply = () => {
    if (!validation.ok || !validation.data) {
      return;
    }
    onApply(validation.data);
    setOpen(false);
  };

  return (
    <>
      {openProp === undefined ? (
        <JsonImportTriggerButton
          labels={triggerLabels}
          onClick={() => setOpen(true)}
        />
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
              disabled={!validation.ok}
              onClick={handleApply}
            >
              {labels.apply}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-wrap items-center gap-2">
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
