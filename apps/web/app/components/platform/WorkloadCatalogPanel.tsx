import { Heading, Text } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { WorkloadWithState } from "../../lib/admin-client";
import {
  designerPreviewPanelBodyFillClassName,
  designerPreviewPanelHeaderClassName,
  designerPreviewPanelShellClassName,
  designerPreviewPanelShellFillClassName,
} from "../../features/ui-builder/designer-tree-workbench-classes";
import {
  CATALOG_WORKLOAD_KINDS,
  CatalogHandlerBadge,
  WORKLOAD_LIST_ROW_HOVER_CLASS,
  kindLabelKey,
} from "./workload-ui-shared";

function CatalogHandlerRow({
  handler,
  parentLabel,
  onSelect,
  onSelectParent,
}: {
  readonly handler: WorkloadWithState;
  readonly parentLabel?: string;
  readonly onSelect: () => void;
  readonly onSelectParent?: (id: string) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-md border-l-2 border-l-muted-foreground/30 px-3 py-2 text-left transition-colors duration-150",
        WORKLOAD_LIST_ROW_HOVER_CLASS,
      )}
      onClick={onSelect}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CatalogHandlerBadge size="compact" />
        <Text className="min-w-0 break-words text-sm font-medium">
          {handler.displayName}
        </Text>
      </div>
      <Text className="text-muted-foreground text-xs">
        {t(kindLabelKey(handler.kind) as never)}
        {handler.route ? ` · ${handler.route}` : ""}
      </Text>
      {handler.sourceFile ? (
        <Text className="text-muted-foreground font-mono text-[11px]">
          {handler.sourceFile}
        </Text>
      ) : null}
      {handler.controlledBy && handler.controlledBy.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {handler.controlledBy.map((parentId) => (
            <span
              key={parentId}
              role="link"
              tabIndex={0}
              className="text-primary text-xs underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                onSelectParent?.(parentId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectParent?.(parentId);
                }
              }}
            >
              {parentLabel && handler.controlledBy?.length === 1
                ? parentLabel
                : parentId}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

export function WorkloadCatalogPanel({
  handlers,
  parentLabels,
  onSelect,
  onSelectParent,
}: {
  readonly handlers: readonly WorkloadWithState[];
  readonly parentLabels?: ReadonlyMap<string, string>;
  readonly onSelect: (id: string) => void;
  readonly onSelectParent: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return handlers;
    return handlers.filter(
      (handler) =>
        handler.displayName.toLowerCase().includes(q) ||
        handler.id.toLowerCase().includes(q) ||
        handler.route?.toLowerCase().includes(q) ||
        handler.sourceFile?.toLowerCase().includes(q) ||
        handler.description?.toLowerCase().includes(q),
    );
  }, [handlers, query]);

  const grouped = useMemo(() => {
    return CATALOG_WORKLOAD_KINDS.map((kind) => ({
      kind,
      items: filtered.filter((handler) => handler.kind === kind),
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  return (
    <section
      className={cn(
        designerPreviewPanelShellClassName,
        designerPreviewPanelShellFillClassName,
      )}
    >
      <div className={cn(designerPreviewPanelHeaderClassName, "shrink-0")}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookOpen
              aria-hidden
              className="text-muted-foreground size-5 shrink-0"
            />
            <Heading level={2}>{t("platform.workloads.catalogTitle")}</Heading>
          </div>
          <Text className="text-muted-foreground mt-1 text-sm">
            {t("platform.workloads.catalogSubtitle")}
          </Text>
        </div>
      </div>

      <div className={cn(designerPreviewPanelBodyFillClassName, "space-y-4")}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("platform.workloads.catalogSearchPlaceholder")}
          aria-label={t("platform.workloads.catalogSearchPlaceholder")}
          className="border-input-border bg-input-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
        />

        {grouped.length === 0 ? (
          <Text className="text-muted-foreground text-sm">
            {t("platform.workloads.catalogEmpty")}
          </Text>
        ) : (
          grouped.map((group) => (
            <div key={group.kind} className="space-y-2">
              <Text className="text-muted-foreground text-xs font-medium">
                {t(kindLabelKey(group.kind) as never)}
              </Text>
              <ul className="space-y-2">
                {group.items.map((handler) => (
                  <li key={handler.id}>
                    <CatalogHandlerRow
                      handler={handler}
                      parentLabel={
                        handler.controlledBy?.[0]
                          ? parentLabels?.get(handler.controlledBy[0])
                          : undefined
                      }
                      onSelect={() => onSelect(handler.id)}
                      onSelectParent={onSelectParent}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function RelatedHandlersList({
  handlers,
  onSelect,
}: {
  readonly handlers: readonly WorkloadWithState[];
  readonly onSelect: (id: string) => void;
}) {
  const { t } = useTranslation("common");

  if (handlers.length === 0) {
    return (
      <Text className="text-muted-foreground text-sm">
        {t("platform.workloads.relatedHandlersEmpty")}
      </Text>
    );
  }

  return (
    <ul className="space-y-2">
      {handlers.map((handler) => (
        <li key={handler.id}>
          <CatalogHandlerRow
            handler={handler}
            onSelect={() => onSelect(handler.id)}
          />
        </li>
      ))}
    </ul>
  );
}
