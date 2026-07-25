import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC } from "../../components/entity/entity-layout-image-placeholder";
import {
  getEntityIconName,
  getEntityLabel,
} from "../../entities/entity-catalog";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { getEntity } from "../../lib/api-client";
import { resolveLucideIcon } from "../../lib/resolve-lucide-icon";
import { buildGlobalSearchRecordSnippet } from "../global-search/build-global-search-record-snippet";
import { resolveGlobalSearchHitImageUrl } from "../global-search/resolve-global-search-hit-image-url";
import { AiChatTypingDots } from "./AiChatTypingDots";

const CLOSE_DELAY_MS = 160;
const PREVIEW_WIDTH_PX = 288;

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

function fallbackLabelFromChildren(children: ReactNode): string {
  if (typeof children === "string") {
    return children.trim();
  }
  if (typeof children === "number") {
    return String(children);
  }
  return "";
}

/**
 * Inline record hit chip with hover preview.
 * Portal uses a `div` (not Popover) so Markdown `<p>` ancestry stays valid.
 */
export function AiChatRecordHit({
  entityName,
  recordId,
  children,
}: {
  readonly entityName: string;
  readonly recordId: string;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { getDefinition, isKnownEntity } = useEntityCatalog();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const recordPath = `/app/${encodeURIComponent(entityName)}/${encodeURIComponent(recordId)}`;
  const chipLabel = fallbackLabelFromChildren(children) || entityName;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openPanel = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const recordQuery = useQuery({
    queryKey: ["ai-chat-record-hit", entityName, recordId] as const,
    queryFn: () => getEntity<Record<string, unknown>>(entityName, recordId),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(PREVIEW_WIDTH_PX, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const estimatedHeight = 112;
    const preferBelow = rect.bottom + 12 + estimatedHeight < window.innerHeight;
    setPanelStyle({
      position: "fixed",
      left,
      width,
      top: preferBelow ? rect.bottom + 8 : undefined,
      bottom: preferBelow ? undefined : window.innerHeight - rect.top + 8,
    });
  }, [open]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  const definition = isKnownEntity(entityName)
    ? getDefinition(entityName)
    : undefined;
  const entityTypeLabel = definition ? getEntityLabel(definition) : entityName;
  const chipIconName = definition ? getEntityIconName(definition) : undefined;
  const ChipIcon = chipIconName ? resolveLucideIcon(chipIconName) : null;
  const record = recordQuery.data ?? null;
  const name = pickRecordLabel(record, chipLabel);
  const imageUrl =
    record && definition
      ? resolveGlobalSearchHitImageUrl({ record, definition })
      : undefined;
  const iconName = definition ? getEntityIconName(definition) : undefined;
  const Icon = !imageUrl && iconName ? resolveLucideIcon(iconName) : null;
  const description =
    record &&
    typeof record.description === "string" &&
    record.description.trim()
      ? record.description.trim()
      : record && definition
        ? buildGlobalSearchRecordSnippet({
            record,
            definition,
            label: name,
          })
        : null;

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            id={panelId}
            role="tooltip"
            className="ai-chat-record-hit-popover"
            style={panelStyle}
            data-testid={`ai-chat-record-hit-preview-${entityName}-${recordId}`}
            onMouseEnter={openPanel}
            onMouseLeave={scheduleClose}
          >
            <div className="ai-chat-record-hit-popover__row">
              <div className="ai-chat-record-hit-popover__thumb">
                {imageUrl ? (
                  <img src={imageUrl} alt="" />
                ) : Icon ? (
                  <Icon className="size-4" aria-hidden />
                ) : (
                  <img src={ENTITY_LAYOUT_IMAGE_PLACEHOLDER_SRC} alt="" />
                )}
              </div>

              <div className="ai-chat-record-hit-popover__content">
                <div className="ai-chat-record-hit-popover__title-row">
                  <span className="ai-chat-record-hit-popover__title">
                    {name}
                  </span>
                  <Link
                    to={recordPath}
                    className="ai-chat-record-hit-popover__open"
                    aria-label={t("aiChat.hitPreviewOpen")}
                  >
                    <span>{t("aiChat.hitPreviewOpen")}</span>
                    <ArrowUpRight
                      className="size-3"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </Link>
                </div>

                <span className="ai-chat-record-hit-popover__type">
                  {entityTypeLabel}
                </span>

                {recordQuery.isLoading ? (
                  <span className="ai-chat-record-hit-popover__status">
                    <AiChatTypingDots label={t("aiChat.hitPreviewLoading")} />
                    <span>{t("aiChat.hitPreviewLoading")}</span>
                  </span>
                ) : description ? (
                  <span className="ai-chat-record-hit-popover__desc">
                    {description}
                  </span>
                ) : recordQuery.isError ? (
                  <span className="ai-chat-record-hit-popover__status">
                    {t("aiChat.hitPreviewUnavailable")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Link
        ref={triggerRef}
        to={recordPath}
        className="ai-chat-record-hit"
        data-testid={`ai-chat-record-hit-${entityName}-${recordId}`}
        aria-describedby={open ? panelId : undefined}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        onFocus={openPanel}
        onBlur={scheduleClose}
      >
        {ChipIcon ? (
          <ChipIcon
            className="ai-chat-record-hit__icon"
            aria-hidden
            strokeWidth={2.25}
          />
        ) : null}
        <span className="ai-chat-record-hit__label">{children}</span>
      </Link>
      {panel}
    </>
  );
}
