import { Alert, Button, Popover, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

import type { UiBuilderSuggestionRecord } from "../../lib/api-client";

interface UiBuilderAiSuggestionsPopoverProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly trigger: React.ReactNode;
  readonly suggestions: readonly UiBuilderSuggestionRecord[];
  readonly isLoading: boolean;
  readonly onApply: (suggestion: UiBuilderSuggestionRecord) => void;
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

export function UiBuilderAiSuggestionsPopover({
  open,
  onOpenChange,
  trigger,
  suggestions,
  isLoading,
  onApply,
}: UiBuilderAiSuggestionsPopoverProps) {
  const { t } = useTranslation("common");

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      placement="bottom-end"
      title={t("itemListDesigner.ai.historyTitle")}
      panelClassName="w-96"
    >
      <div className="max-h-80 space-y-2 overflow-y-auto p-1">
        {isLoading ? (
          <Text className="text-sm text-muted-foreground">{t("loading")}</Text>
        ) : null}
        {!isLoading && suggestions.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            {t("itemListDesigner.ai.historyEmpty")}
          </Text>
        ) : null}
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
          >
            <div className="min-w-0 space-y-1">
              <Text className="text-sm font-medium">
                {suggestion.listViewType ?? suggestion.surface}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatDate(suggestion.createdAt)}
              </Text>
              {suggestion.status === "failed" ? (
                <Alert>{t("itemListDesigner.ai.historyFailedItem")}</Alert>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={suggestion.status !== "ready" || !suggestion.sliceData}
              onClick={() => onApply(suggestion)}
            >
              {t("itemListDesigner.ai.apply")}
            </Button>
          </div>
        ))}
      </div>
    </Popover>
  );
}
