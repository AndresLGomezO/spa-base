import { Alert, Button, Popover, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import { resolveBrowserStorageUrl } from "../../lib/resolve-browser-storage-url";
import { formatAiJobError } from "./use-ai-ui-builder";
import { isRenderSuggestion } from "./UiBuilderAiRenderViewModal";
import { RenderHtmlPreviewIframe } from "./RenderHtmlPreviewIframe";

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

function resolvePresentationLabel(
  suggestion: UiBuilderSuggestionRecord,
): string {
  if (suggestion.listViewType) {
    return suggestion.listViewType;
  }
  const slicePresentation = (
    suggestion.sliceData as Record<string, unknown> | undefined
  )?.presentation;
  if (typeof slicePresentation === "string") {
    return slicePresentation;
  }
  return suggestion.surface;
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
  readonly onView?: (suggestion: UiBuilderSuggestionRecord) => void;
  readonly translationPrefix?: string;
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
  onView,
  translationPrefix = "itemListDesigner.ai",
}: UiBuilderAiResultPopoverProps) {
  const { t } = useTranslation("common");
  const key = (suffix: string) => `${translationPrefix}.${suffix}` as const;
  const translateError = (errorKey: string): string => t(errorKey as never);
  const formattedJobError = jobError
    ? formatAiJobError(jobError, translateError)
    : null;
  const renderSuggestion =
    suggestion != null ? isRenderSuggestion(suggestion) : false;

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      placement="bottom-end"
      title={t(key("resultTitle") as never)}
      panelClassName="w-80"
      hoverable={hoverable}
      openOnClick={openOnClick}
      onHoverOpenChange={onHoverOpenChange}
    >
      <div className="space-y-3 p-1">
        {finishedAt ? (
          <Text className="text-xs text-muted-foreground">
            {t(key("lastRunAt") as never, {
              date: formatDate(finishedAt),
            })}
          </Text>
        ) : null}
        {formattedJobError ? <Alert>{formattedJobError}</Alert> : null}
        {suggestion?.status === "failed" ? (
          <div className="space-y-2">
            <Alert>{t(key("resultFailed") as never)}</Alert>
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
            {renderSuggestion && suggestion.renderHtml ? (
              <RenderHtmlPreviewIframe
                html={suggestion.renderHtml}
                title=""
                className="max-h-32 w-full rounded border border-border bg-white"
              />
            ) : null}
            {renderSuggestion &&
            !suggestion.renderHtml &&
            suggestion.imageUrl ? (
              <img
                src={resolveBrowserStorageUrl(suggestion.imageUrl)}
                alt=""
                className="max-h-32 w-full rounded border border-border object-cover"
              />
            ) : null}
            <Text className="text-sm">
              {renderSuggestion
                ? t(key("renderResultReady") as never)
                : translationPrefix === "formDesigner.ai"
                  ? t("formDesigner.ai.resultReady" as never, {
                      presentation: suggestion
                        ? resolvePresentationLabel(suggestion)
                        : "",
                    })
                  : t("itemListDesigner.ai.resultReady" as never, {
                      listViewType:
                        suggestion?.listViewType ?? "expandableTable",
                    })}
            </Text>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t(key("dismiss") as never)}
              </Button>
              {renderSuggestion && onView ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onView(suggestion)}
                >
                  {t(key("view") as never)}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApply(suggestion)}
                >
                  {t(key("apply") as never)}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        {!formattedJobError && !suggestion && finishedAt ? (
          <Text className="text-sm text-muted-foreground">
            {t(key("resultPendingSuggestion") as never)}
          </Text>
        ) : null}
      </div>
    </Popover>
  );
}
