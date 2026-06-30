import { useEffect, useMemo, useState } from "react";
import { serializeTenantBundle } from "@repo/tenant-bundle";
import { Alert, Button, Modal, Text } from "@repo/ui";

import { exportAdminTenantBundle } from "../../lib/admin-client";
import type { TenantBundleJsonLabels } from "./tenant-bundle-json-labels";

interface TenantBundleJsonViewDialogProps {
  readonly tenantId: string;
  readonly labels: TenantBundleJsonLabels;
  readonly triggerSize?: "sm" | "md" | "lg";
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function TenantBundleJsonViewDialog({
  tenantId,
  labels,
  triggerSize = "sm",
  open: openProp,
  onOpenChange,
}: TenantBundleJsonViewDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    if (!open) {
      setJsonText("");
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    void exportAdminTenantBundle(tenantId)
      .then((bundle) => {
        if (cancelled) {
          return;
        }
        setJsonText(serializeTenantBundle(bundle));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : labels.viewLoadFailed,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [labels.viewLoadFailed, open, tenantId]);

  const displayText = useMemo(() => jsonText, [jsonText]);

  const handleCopy = async () => {
    if (!displayText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(displayText);
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
              disabled={!displayText}
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
          {isLoading ? (
            <Text className="text-muted-foreground text-sm">
              {labels.viewLoading}
            </Text>
          ) : null}
          {loadError ? <Alert>{loadError}</Alert> : null}
          {!isLoading && !loadError ? (
            <pre className="bg-muted max-h-[min(60vh,28rem)] overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
              {displayText}
            </pre>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
