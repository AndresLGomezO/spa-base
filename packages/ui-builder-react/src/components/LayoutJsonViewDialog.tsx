import { useMemo, useState } from "react";
import type {
  ComponentRowNode,
  LayoutJsonImportScope,
  NestedLayoutRowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Modal, Text } from "@repo/ui";

import type { LayoutJsonImportLabels } from "./LayoutJsonImportDialog.js";

export interface LayoutJsonViewDialogProps {
  readonly scope: LayoutJsonImportScope;
  readonly data: UiLayoutDocument | ComponentRowNode | NestedLayoutRowNode;
  readonly labels: LayoutJsonImportLabels;
  readonly triggerSize?: "sm" | "md" | "lg";
}

function titleForScope(
  scope: LayoutJsonImportScope,
  labels: LayoutJsonImportLabels,
): string {
  switch (scope.type) {
    case "layout-document":
      return labels.viewTitleRoot;
    case "component-row":
      return labels.viewTitleComponentRow;
    case "nested-layout-row":
      return labels.viewTitleNestedRow;
  }
}

export function LayoutJsonViewDialog({
  scope,
  data,
  labels,
  triggerSize = "sm",
}: LayoutJsonViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(() => JSON.stringify(data, null, 2), [data]);

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
      <Button
        type="button"
        variant="outline"
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        {labels.viewTrigger}
      </Button>

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
