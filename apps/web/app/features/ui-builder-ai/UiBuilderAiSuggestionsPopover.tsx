import { Alert, Button, Popover, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import { resolveBrowserStorageUrl } from "../../lib/resolve-browser-storage-url";
import { isRenderSuggestion } from "./UiBuilderAiRenderViewModal";

interface UiBuilderAiSuggestionsPopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: React.ReactNode;
  readonly suggestions: readonly UiBuilderSuggestionRecord[];
  readonly isLoading: boolean;
  readonly onApply: (suggestion: UiBuilderSuggestionRecord) => void;
  readonly onView?: (suggestion: UiBuilderSuggestionRecord) => void;
  readonly translationPrefix?: string;
}

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

function suggestionLabel(suggestion: UiBuilderSuggestionRecord): string {
  if (isRenderSuggestion(suggestion)) {
    return "render";
  }
  if (suggestion.listViewType) {
    return suggestion.listViewType;
  }
  const sliceRecord = suggestion.sliceData as
    | Record<string, unknown>
    | undefined;
  const presentation = sliceRecord?.presentation;
  if (typeof presentation === "string") {
    return presentation;
  }
  return suggestion.surface;
}

export function UiBuilderAiSuggestionsPopover({
  open,
  onOpenChange,
  trigger,
  suggestions,
  isLoading,
  onApply,
  onView,
  translationPrefix = "itemListDesigner.ai",
}: UiBuilderAiSuggestionsPopoverProps) {
  const { t } = useTranslation("common");
  const key = (suffix: string) => `${translationPrefix}.${suffix}` as const;

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      placement="bottom-end"
      title={t(key("historyTitle") as never)}
      panelClassName="w-96"
    >
      <div className="max-h-80 space-y-2 overflow-y-auto p-1">
        {isLoading ? (
          <Text className="text-sm text-muted-foreground">{t("loading")}</Text>
        ) : null}
        {!isLoading && suggestions.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            {t(key("historyEmpty") as never)}
          </Text>
        ) : null}
        {suggestions.map((suggestion) => {
          const renderSuggestion = isRenderSuggestion(suggestion);
          const canView =
            renderSuggestion &&
            suggestion.status === "ready" &&
            Boolean(suggestion.renderHtml || suggestion.imageUrl);
          const canApply =
            !renderSuggestion &&
            suggestion.status === "ready" &&
            Boolean(suggestion.sliceData);

          return (
            <div
              key={suggestion.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Text className="text-sm font-medium">
                  {isRenderSuggestion(suggestion)
                    ? t(key("historyRenderItem") as never, {
                        iteration: (suggestion.iterationNumber ?? 0) + 1,
                      })
                    : suggestionLabel(suggestion)}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatDate(suggestion.createdAt)}
                </Text>
                {canView && suggestion.imageUrl && !suggestion.renderHtml ? (
                  <img
                    src={resolveBrowserStorageUrl(suggestion.imageUrl)}
                    alt=""
                    className="mt-2 max-h-16 rounded border border-border object-cover"
                  />
                ) : null}
                {suggestion.status === "failed" ? (
                  <Alert>{t(key("historyFailedItem") as never)}</Alert>
                ) : null}
              </div>
              {canView && onView ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onView(suggestion)}
                >
                  {t(key("view") as never)}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canApply}
                  onClick={() => onApply(suggestion)}
                >
                  {t(key("apply") as never)}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Popover>
  );
}
