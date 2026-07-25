import { useCallback, useMemo } from "react";

import { normalizeGroundedChatAnswerLinks } from "@repo/ai-context/grounded-chat-record-ref";
import { Markdown, type MarkdownLinkRenderer } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import type { AiChatCitation } from "../../lib/api-client";
import { AiChatRecordHit } from "./AiChatRecordHit";

const RECORD_HREF_PREFIX = "record:";

function parseRecordHref(
  href: string,
): { entityName: string; recordId: string } | null {
  const trimmed = href.trim();
  if (!trimmed.startsWith(RECORD_HREF_PREFIX)) {
    return null;
  }
  const path = trimmed.slice(RECORD_HREF_PREFIX.length);
  const slash = path.indexOf("/");
  if (slash <= 0 || slash === path.length - 1) {
    return null;
  }
  const entityName = path.slice(0, slash).trim();
  const recordId = path.slice(slash + 1).trim();
  if (!entityName || !recordId) {
    return null;
  }
  return { entityName, recordId };
}

export function AiChatMarkdown({
  children,
  citations,
  className,
}: {
  readonly children: string;
  readonly citations?: readonly AiChatCitation[];
  readonly className?: string;
}) {
  const sanitized = useMemo(
    () =>
      normalizeGroundedChatAnswerLinks(
        children,
        (citations ?? []).map((citation) => ({
          entityName: citation.entityName,
          recordId: citation.recordId,
          label: citation.label,
        })),
      ),
    [children, citations],
  );

  const renderLink = useCallback<MarkdownLinkRenderer>(
    ({ href, children: linkChildren }) => {
      const ref = parseRecordHref(href);
      if (ref) {
        return (
          <AiChatRecordHit entityName={ref.entityName} recordId={ref.recordId}>
            {linkChildren}
          </AiChatRecordHit>
        );
      }
      return (
        <a
          href={href}
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          {linkChildren}
        </a>
      );
    },
    [],
  );

  return (
    <Markdown
      className={cn("ai-chat-md !space-y-0", className)}
      renderLink={renderLink}
      allowedLinkSchemes={["record"]}
    >
      {sanitized}
    </Markdown>
  );
}
