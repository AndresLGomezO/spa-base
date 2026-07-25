import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { AiChatCitation } from "../../lib/api-client";

export function AiChatCitations({
  citations,
  className,
}: {
  readonly citations: readonly AiChatCitation[];
  readonly className?: string;
}) {
  const { t } = useTranslation("common");

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <Text className="text-muted-foreground w-full text-xs">
        {t("aiChat.citations")}
      </Text>
      {citations.map((citation, index) => {
        const key = `${citation.kind}-${citation.recordId ?? citation.metricId ?? citation.queryId ?? citation.label}-${index}`;
        if (
          citation.kind === "entity" &&
          citation.entityName &&
          citation.recordId
        ) {
          return (
            <Link
              key={key}
              to={`/app/${encodeURIComponent(citation.entityName)}/${encodeURIComponent(citation.recordId)}`}
              className="bg-muted hover:bg-hover inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs text-primary transition-colors"
            >
              {citation.label}
            </Link>
          );
        }
        return (
          <span
            key={key}
            className="bg-muted text-muted-foreground inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs"
          >
            {citation.label}
          </span>
        );
      })}
    </div>
  );
}
