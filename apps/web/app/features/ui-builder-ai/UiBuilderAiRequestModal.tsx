import { Alert, Button, Modal, Text, Textarea } from "@repo/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface UiBuilderAiRequestModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly entityLabel: string;
  readonly isSubmitting: boolean;
  readonly jobInProgress?: boolean;
  readonly onSubmit: (userContext: string) => void;
}

export function UiBuilderAiRequestModal({
  open,
  onOpenChange,
  entityLabel,
  isSubmitting,
  jobInProgress = false,
  onSubmit,
}: UiBuilderAiRequestModalProps) {
  const { t } = useTranslation("common");
  const [userContext, setUserContext] = useState("");

  useEffect(() => {
    if (!open) {
      setUserContext("");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t("itemListDesigner.ai.requestTitle")}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("itemListDesigner.ai.cancel")}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={jobInProgress}
            onClick={() => onSubmit(userContext.trim())}
          >
            {t("itemListDesigner.ai.buildButton")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {jobInProgress ? (
          <Alert>{t("itemListDesigner.ai.jobInProgress")}</Alert>
        ) : null}
        <Text>
          {t("itemListDesigner.ai.requestDescription", { entity: entityLabel })}
        </Text>
        <div className="space-y-2">
          <Text className="text-sm font-medium text-foreground">
            {t("itemListDesigner.ai.contextLabel")}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t("itemListDesigner.ai.contextHelper")}
          </Text>
          <Textarea
            value={userContext}
            onChange={(event) => setUserContext(event.target.value)}
            rows={5}
            placeholder={t("itemListDesigner.ai.contextExample")}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
}
