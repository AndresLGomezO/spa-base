import {
  Alert,
  Button,
  Modal,
  SegmentedSwitch,
  Text,
  Textarea,
} from "@repo/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type UiBuilderAiRequestMode = "structure" | "render";

interface UiBuilderAiRequestModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly entityLabel: string;
  readonly isSubmitting: boolean;
  readonly jobInProgress?: boolean;
  readonly translationPrefix?: string;
  readonly modes?: readonly UiBuilderAiRequestMode[];
  readonly onSubmit: (
    userContext: string,
    mode: UiBuilderAiRequestMode,
  ) => void;
}

export function UiBuilderAiRequestModal({
  open,
  onOpenChange,
  entityLabel,
  isSubmitting,
  jobInProgress = false,
  translationPrefix = "itemListDesigner.ai",
  modes,
  onSubmit,
}: UiBuilderAiRequestModalProps) {
  const { t } = useTranslation("common");
  const key = (suffix: string) => `${translationPrefix}.${suffix}` as const;
  const availableModes = useMemo(
    () => modes ?? (["structure"] as const),
    [modes],
  );
  const [userContext, setUserContext] = useState("");
  const [activeMode, setActiveMode] = useState<UiBuilderAiRequestMode>(
    availableModes[0] ?? "structure",
  );

  useEffect(() => {
    if (!open) {
      setUserContext("");
      setActiveMode(availableModes[0] ?? "structure");
    }
  }, [availableModes, open]);

  const isRenderMode = activeMode === "render";

  const modeOptions = useMemo(
    () =>
      availableModes.map((mode) => {
        const labelKey =
          mode === "render"
            ? `${translationPrefix}.modeRender`
            : `${translationPrefix}.modeStructure`;
        const label = String(t(labelKey as never));
        return {
          value: mode,
          label,
          ariaLabel: label,
        };
      }),
    [availableModes, t, translationPrefix],
  );
  const descriptionKey = isRenderMode
    ? "renderRequestDescription"
    : "requestDescription";
  const contextHelperKey = isRenderMode
    ? "renderContextHelper"
    : "contextHelper";
  const contextExampleKey = isRenderMode
    ? "renderContextExample"
    : "contextExample";
  const buildButtonKey = isRenderMode ? "renderBuildButton" : "buildButton";

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t(key("requestTitle") as never)}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t(key("cancel") as never)}
          </Button>
          <Button
            type="button"
            loading={isSubmitting}
            disabled={jobInProgress}
            onClick={() => onSubmit(userContext.trim(), activeMode)}
          >
            {t(key(buildButtonKey) as never)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {jobInProgress ? (
          <Alert>{t(key("jobInProgress") as never)}</Alert>
        ) : null}
        {availableModes.length > 1 ? (
          <SegmentedSwitch
            value={activeMode}
            onChange={setActiveMode}
            ariaLabel={t(key("modeSwitchLabel") as never)}
            fullWidth
            options={modeOptions}
          />
        ) : null}
        <Text>{t(key(descriptionKey) as never, { entity: entityLabel })}</Text>
        <div className="space-y-2">
          <Text className="text-sm font-medium text-foreground">
            {t(key("contextLabel") as never)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t(key(contextHelperKey) as never)}
          </Text>
          <Textarea
            value={userContext}
            onChange={(event) => setUserContext(event.target.value)}
            rows={5}
            placeholder={t(key(contextExampleKey) as never)}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Modal>
  );
}
