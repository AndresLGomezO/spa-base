import { useMemo, useState } from "react";
import {
  createEntityQueryDefinitionsCatalogEnvelope,
  type EntityQueryDefinitionRecord as PackageEntityQueryDefinitionRecord,
} from "@repo/entity-queries/browser";
import {
  Button,
  JsonViewTriggerButton,
  Modal,
  Text,
  type JsonActionTriggerLabels,
} from "@repo/ui";

import type { EntityQueryDefinitionRecord } from "../../../lib/api-client";
import type { EntityQueryDefinitionsCatalogJsonLabels } from "./entity-query-definition-json-labels.js";

interface EntityQueryDefinitionsCatalogJsonViewDialogProps {
  readonly items: readonly EntityQueryDefinitionRecord[];
  readonly labels: EntityQueryDefinitionsCatalogJsonLabels;
  readonly triggerLabels?: JsonActionTriggerLabels;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function EntityQueryDefinitionsCatalogJsonViewDialog({
  items,
  labels,
  triggerLabels,
  open: openProp,
  onOpenChange,
}: EntityQueryDefinitionsCatalogJsonViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(() => {
    if (!open) {
      return "";
    }

    try {
      return JSON.stringify(
        createEntityQueryDefinitionsCatalogEnvelope(
          items as unknown as readonly PackageEntityQueryDefinitionRecord[],
        ),
        null,
        2,
      );
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Failed to export catalog.";
    }
  }, [items, open]);

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
        <JsonViewTriggerButton
          labels={triggerLabels}
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
