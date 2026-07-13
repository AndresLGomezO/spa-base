import { Button, Modal, Text } from "@repo/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type GmailBackfillConfirmMode =
  | { readonly kind: "all" }
  | { readonly kind: "binding"; readonly bindingLabel: string };

interface GmailBackfillConfirmDialogProps {
  readonly open: boolean;
  readonly mode: GmailBackfillConfirmMode | null;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (reprocess: boolean) => void;
}

export function GmailBackfillConfirmDialog({
  open,
  mode,
  isPending,
  onClose,
  onConfirm,
}: GmailBackfillConfirmDialogProps) {
  const { t } = useTranslation("common");
  const [reprocess, setReprocess] = useState(false);

  useEffect(() => {
    if (!open) {
      setReprocess(false);
    }
  }, [open]);

  const isAll = mode?.kind === "all";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isAll
          ? t("platform.email.backfillAllTitle")
          : t("platform.email.backfillBindingTitle")
      }
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("platform.email.cancelEdit")}
          </Button>
          <Button
            type="button"
            disabled={isPending || mode == null}
            onClick={() => onConfirm(reprocess)}
          >
            {t("platform.email.backfillConfirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Text className="text-sm">
          {isAll
            ? t("platform.email.backfillAllDescription")
            : t("platform.email.backfillBindingDescription", {
                binding: mode?.kind === "binding" ? mode.bindingLabel : "",
              })}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("platform.email.backfillConfirmHint")}
        </Text>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={reprocess}
            onChange={(event) => setReprocess(event.target.checked)}
          />
          <span>
            {t("platform.email.reprocess")}
            {reprocess ? (
              <Text className="text-muted-foreground mt-1 text-xs">
                {t("platform.email.reprocessHint")}
              </Text>
            ) : null}
          </span>
        </label>
      </div>
    </Modal>
  );
}
