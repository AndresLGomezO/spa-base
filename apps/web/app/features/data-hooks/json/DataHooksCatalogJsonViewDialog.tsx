import { useMemo, useState } from "react";
import {
  createDataHooksCatalogEnvelope,
  type DataHookDefinition,
} from "@repo/hooks/browser";
import {
  Button,
  JsonViewTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import type { DataHookDefinitionRecord } from "../../../lib/api-client";
import type { DataHooksCatalogJsonLabels } from "./data-hook-definition-json-labels.js";

interface DataHooksCatalogJsonViewDialogProps {
  readonly items: readonly DataHookDefinitionRecord[];
  readonly labels: DataHooksCatalogJsonLabels;
  readonly triggerLabels?: JsonActionTriggerLabels;
}

export function DataHooksCatalogJsonViewDialog({
  items,
  labels,
  triggerLabels,
}: DataHooksCatalogJsonViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () =>
      JSON.stringify(
        createDataHooksCatalogEnvelope(
          items as unknown as readonly DataHookDefinition[],
        ),
        null,
        2,
      ),
    [items],
  );

  const handleCopy = async () => {
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
      <JsonViewTriggerButton
        labels={triggerLabels}
        onClick={() => setOpen(true)}
      />

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
            {jsonText}
          </pre>
        </div>
      </Modal>
    </>
  );
}
