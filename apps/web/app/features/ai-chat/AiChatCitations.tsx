import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import { cn } from "@repo/theme/utils";

import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "../../components/entity/entity-layout-image-placeholder";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import {
  getEntityIconName,
  getEntityLabel,
  type EntityCatalogEntry,
} from "../../entities/entity-catalog";
import { getEntity } from "../../lib/api-client";
import type { AiChatCitation } from "../../lib/api-client";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import { buildGlobalSearchRecordSnippet } from "../global-search/build-global-search-record-snippet";
import { resolveGlobalSearchHitImageUrl } from "../global-search/resolve-global-search-hit-image-url";

type EntityCitation = AiChatCitation & {
  readonly kind: "entity";
  readonly entityName: string;
  readonly recordId: string;
};

function isEntityCitation(
  citation: AiChatCitation,
): citation is EntityCitation {
  return (
    citation.kind === "entity" &&
    typeof citation.entityName === "string" &&
    citation.entityName.trim().length > 0 &&
    typeof citation.recordId === "string" &&
    citation.recordId.trim().length > 0
  );
}

function pickRecordLabel(
  record: Record<string, unknown> | null | undefined,
  fallback: string,
): string {
  if (!record) return fallback;
  for (const key of ["name", "title", "label", "description"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

function AiChatSourceRow({
  citation,
  definition,
  record,
  loading,
  index,
}: {
  readonly citation: EntityCitation;
  readonly definition?: EntityCatalogEntry;
  readonly record?: Record<string, unknown> | null;
  readonly loading: boolean;
  readonly index: number;
}) {
  const { t } = useTranslation("common");
  const label = pickRecordLabel(record, citation.label);
  const imageUrl =
    record && definition
      ? resolveGlobalSearchHitImageUrl({ record, definition })
      : undefined;
  const iconName = definition ? getEntityIconName(definition) : undefined;
  const Icon = !imageUrl && iconName ? resolveLucideIcon(iconName) : null;
  const entityLabel = definition
    ? getEntityLabel(definition)
    : citation.entityName;
  const snippet =
    record && definition
      ? buildGlobalSearchRecordSnippet({
          record,
          definition,
          label,
        })
      : null;

  return (
    <li
      className="ai-chat-source-row hover:bg-hover/40 flex items-start gap-3 rounded-md px-2 py-2"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      data-testid={`ai-chat-source-row-${citation.entityName}-${citation.recordId}`}
    >
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : Icon ? (
          <Icon className="size-5" aria-hidden />
        ) : (
          <img
            src={ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC}
            alt=""
            className="size-full object-cover"
          />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/app/${encodeURIComponent(citation.entityName)}/${encodeURIComponent(citation.recordId)}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            {label}
          </Link>
          <span className="border-border bg-muted text-muted-foreground inline-flex rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">
            {entityLabel}
          </span>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-xs">
            {t("aiChat.sourcesLoading")}
          </p>
        ) : snippet ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {snippet}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function AiChatCitations({
  citations,
  className,
}: {
  readonly citations: readonly AiChatCitation[];
  readonly className?: string;
}) {
  const { t } = useTranslation("common");
  const { getDefinition, isKnownEntity } = useEntityCatalog();
  const [expanded, setExpanded] = useState(false);

  const entityCitations = citations.filter(isEntityCitation);

  const recordQueries = useQueries({
    queries: entityCitations.map((citation) => ({
      queryKey: [
        "ai-chat-citation-record",
        citation.entityName,
        citation.recordId,
      ] as const,
      queryFn: () =>
        getEntity<Record<string, unknown>>(
          citation.entityName,
          citation.recordId,
        ),
      staleTime: 60_000,
      retry: false,
      enabled: expanded,
    })),
  });

  if (entityCitations.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-2 w-full min-w-0", className)}>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
        aria-expanded={expanded}
        data-testid="ai-chat-sources-toggle"
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            expanded ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden
        />
        {t("aiChat.sourcesCount", { count: entityCitations.length })}
      </button>
      {expanded ? (
        <ul className="divide-border/60 mt-1 divide-y">
          {entityCitations.map((citation, index) => {
            const query = recordQueries[index];
            const definition = isKnownEntity(citation.entityName)
              ? getDefinition(citation.entityName)
              : undefined;
            return (
              <AiChatSourceRow
                key={`${citation.entityName}-${citation.recordId}-${index}`}
                citation={citation}
                definition={definition}
                record={query?.data ?? null}
                loading={Boolean(query?.isLoading)}
                index={index}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
