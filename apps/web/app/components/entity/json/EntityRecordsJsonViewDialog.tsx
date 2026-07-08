import { useMemo, useState } from "react";
import {
  Button,
  JsonViewTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import type { EntityRecordsJsonLabels } from "./entity-records-json-labels.js";

interface EntityRecordsJsonViewDialogProps {
  readonly jsonText: string;
  readonly labels: EntityRecordsJsonLabels;
  readonly triggerLabels?: JsonActionTriggerLabels;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly loading?: boolean;
  readonly showTrigger?: boolean;
}

export function EntityRecordsJsonViewDialog({
  jsonText,
  labels,
  triggerLabels,
  open: openProp,
  onOpenChange,
  loading = false,
  showTrigger = true,
}: EntityRecordsJsonViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [copied, setCopied] = useState(false);

  const displayText = useMemo(
    () => (loading ? labels.exportLoading : jsonText),
    [jsonText, labels.exportLoading, loading],
  );

  const handleCopy = async () => {
    if (loading || jsonText.trim().length === 0) {
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {showTrigger ? (
        <JsonViewTriggerButton
          labels={triggerLabels}
          disabled={loading}
          onClick={() => setOpen(true)}
        />
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={labels.viewTitle}
        size="xl"
        scrollable
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={loading || jsonText.trim().length === 0}
              onClick={() => void handleCopy()}
            >
              {copied ? labels.viewCopied : labels.viewCopy}
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Text className="text-muted-foreground text-sm">
            {labels.viewDescription}
          </Text>
          <pre className="bg-muted max-h-[min(60vh,28rem)] overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
            {displayText}
          </pre>
        </div>
      </Modal>
    </>
  );
}
