import { Button, Modal } from "@repo/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function DebuggerJsonViewDialog({
  open,
  onClose,
  title,
  value,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly value: unknown;
}) {
  const { t } = useTranslation("common");
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {t("debugger.actions.close")}
          </Button>
        </div>
      }
    >
      <pre className="bg-muted/40 max-h-[60vh] overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
        {formatted}
      </pre>
    </Modal>
  );
}
