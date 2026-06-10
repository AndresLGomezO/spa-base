import { useMemo, useState } from "react";
import {
  createDesignLayoutSliceEnvelope,
  type DesignLayoutSliceData,
  type DesignLayoutSurface,
} from "@repo/entities";
import { Button, Modal, Text } from "@repo/ui";

import type { DesignLayoutSliceJsonLabels } from "./design-layout-slice-json-labels.js";

interface DesignLayoutSliceJsonViewDialogProps {
  readonly surface: DesignLayoutSurface;
  readonly data: DesignLayoutSliceData;
  readonly labels: DesignLayoutSliceJsonLabels;
  readonly triggerSize?: "sm" | "md" | "lg";
}

export function DesignLayoutSliceJsonViewDialog({
  surface,
  data,
  labels,
  triggerSize = "sm",
}: DesignLayoutSliceJsonViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () =>
      JSON.stringify(createDesignLayoutSliceEnvelope(surface, data), null, 2),
    [data, surface],
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
