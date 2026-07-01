import { useMemo, useState } from "react";
import {
  createEntityDefinitionsCatalogEnvelope,
  type EntityDefinitionRecord,
} from "@repo/dynamic-entities";
import { Button, Modal, Text } from "@repo/ui";

import type { EntityCategoryRecord as ApiEntityCategoryRecord } from "../../../lib/api-client";
import type { EntityDefinitionRecord as ApiEntityDefinitionRecord } from "../../../lib/api-client";
import type { EntityDefinitionsCatalogJsonLabels } from "./entity-definition-json-labels.js";

interface EntityDefinitionsCatalogJsonViewDialogProps {
  readonly items: readonly ApiEntityDefinitionRecord[];
  readonly categories?: readonly ApiEntityCategoryRecord[];
  readonly labels: EntityDefinitionsCatalogJsonLabels;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function EntityDefinitionsCatalogJsonViewDialog({
  items,
  categories = [],
  labels,
  triggerSize = "sm",
  open: openProp,
  onOpenChange,
}: EntityDefinitionsCatalogJsonViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(
    () =>
      JSON.stringify(
        createEntityDefinitionsCatalogEnvelope(
          items as readonly EntityDefinitionRecord[],
          { categories },
        ),
        null,
        2,
      ),
    [categories, items],
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
      {openProp === undefined ? (
        <Button
          type="button"
          variant="outline"
          size={triggerSize}
          onClick={() => setOpen(true)}
        >
          {labels.viewTrigger}
        </Button>
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
