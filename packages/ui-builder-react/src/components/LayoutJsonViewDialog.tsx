import { useMemo, useState, type ReactNode } from "react";
import type {
  ColumnNode,
  ComponentRowNode,
  LayoutJsonImportScope,
  NestedLayoutRowNode,
  UiLayoutDocument,
} from "@repo/ui-builder-core";
import { Button, Modal, Text } from "@repo/ui";

import type { LayoutJsonImportLabels } from "./LayoutJsonImportDialog.js";

export interface LayoutJsonViewDialogProps {
  readonly scope: LayoutJsonImportScope;
  readonly data:
    | UiLayoutDocument
    | ColumnNode
    | ComponentRowNode
    | NestedLayoutRowNode;
  readonly labels: LayoutJsonImportLabels;
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
      return labels.viewTitleRoot;
    case "column":
      return labels.viewTitleColumn ?? labels.viewTitleNestedRow;
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
  renderTrigger,
  open: openProp,
  onOpenChange,
}: LayoutJsonViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
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
          {labels.viewTrigger}
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
