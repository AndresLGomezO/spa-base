import { Alert, Button, Popover, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import { formatAiJobError } from "./use-ai-ui-builder";

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

interface UiBuilderAiResultPopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: React.ReactNode;
  readonly suggestion: UiBuilderSuggestionRecord | null;
  readonly jobError?: string | null;
  readonly finishedAt?: string | null;
  readonly hoverable?: boolean;
  readonly openOnClick?: boolean;
  readonly onHoverOpenChange?: (open: boolean) => void;
  readonly onApply: (suggestion: UiBuilderSuggestionRecord) => void;
}

export function UiBuilderAiResultPopover({
  open,
  onOpenChange,
  trigger,
  suggestion,
  jobError,
  finishedAt,
  hoverable = false,
  openOnClick = true,
  onHoverOpenChange,
  onApply,
}: UiBuilderAiResultPopoverProps) {
  const { t } = useTranslation("common");
  const translateError = (key: string): string => t(key as never);
  const formattedJobError = jobError
    ? formatAiJobError(jobError, translateError)
    : null;

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      placement="bottom-end"
      title={t("itemListDesigner.ai.resultTitle")}
      panelClassName="w-80"
      hoverable={hoverable}
      openOnClick={openOnClick}
      onHoverOpenChange={onHoverOpenChange}
    >
      <div className="space-y-3 p-1">
        {finishedAt ? (
          <Text className="text-xs text-muted-foreground">
            {t("itemListDesigner.ai.lastRunAt", {
              date: formatDate(finishedAt),
            })}
          </Text>
        ) : null}
        {formattedJobError ? <Alert>{formattedJobError}</Alert> : null}
        {suggestion?.status === "failed" ? (
          <div className="space-y-2">
            <Alert>{t("itemListDesigner.ai.resultFailed")}</Alert>
            {suggestion.validationErrors?.slice(0, 3).map((error) => (
              <Text
                key={`${error.path}:${error.message}`}
                className="text-xs text-muted-foreground"
              >
                {error.path}: {error.message}
              </Text>
            ))}
          </div>
        ) : null}
        {suggestion?.status === "ready" ? (
          <div className="space-y-3">
            <Text className="text-sm">
              {t("itemListDesigner.ai.resultReady", {
                listViewType: suggestion.listViewType ?? "table",
              })}
            </Text>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t("itemListDesigner.ai.dismiss")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onApply(suggestion)}
              >
                {t("itemListDesigner.ai.apply")}
              </Button>
            </div>
          </div>
        ) : null}
        {!formattedJobError && !suggestion && finishedAt ? (
          <Text className="text-sm text-muted-foreground">
            {t("itemListDesigner.ai.resultPendingSuggestion")}
          </Text>
        ) : null}
      </div>
    </Popover>
  );
}
