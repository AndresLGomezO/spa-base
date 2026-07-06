import { useMemo, useState } from "react";
import {
  createFormulaDefinitionEnvelope,
  type FormulaDefinitionFormData,
} from "@repo/formula-definitions/browser";
import {
  Button,
  JsonViewTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import type { FormulaDefinitionFormJsonLabels } from "./formula-definition-json-labels.js";

interface FormulaDefinitionJsonViewDialogProps {
  readonly data: FormulaDefinitionFormData;
  readonly labels: FormulaDefinitionFormJsonLabels;
  readonly triggerLabels?: JsonActionTriggerLabels;
}

export function FormulaDefinitionJsonViewDialog({
  data,
  labels,
  triggerLabels,
}: FormulaDefinitionJsonViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () => JSON.stringify(createFormulaDefinitionEnvelope(data), null, 2),
    [data],
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
