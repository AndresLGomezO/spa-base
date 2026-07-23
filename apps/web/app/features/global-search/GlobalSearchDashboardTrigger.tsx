import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";

import type { ViewSearchComponentConfig } from "@repo/ui-builder-core";
import {
  interactiveSearchFieldClass,
  stylesIncludeVisualChrome,
} from "@repo/ui-builder-core";
import { IconButton, Modal, Popover, SearchField } from "@repo/ui";
import { cn } from "@repo/theme/utils";

import { LayoutInteractiveShell } from "../../components/entity/LayoutInteractiveShell";
import { buildGlobalSearchQueryHit } from "./build-global-search-query-hit";
import { GlobalSearchPanel } from "./GlobalSearchPanel";
import { buildGlobalSearchResultsPath } from "./global-search-results-url";
import type { GlobalSearchHit } from "./global-search-types";
import { useGlobalSearchDesktop } from "./use-global-search-desktop";
import { useGlobalSearchRecent } from "./use-global-search-recent";
import { useGlobalSearchResults } from "./use-global-search-results";

interface GlobalSearchDashboardTriggerProps {
  readonly config: ViewSearchComponentConfig;
  readonly previewMode?: boolean;
}

export function GlobalSearchDashboardTrigger({
  config,
  previewMode = false,
}: GlobalSearchDashboardTriggerProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const isDesktop = useGlobalSearchDesktop();
  const { recent, remember, forget, refresh } = useGlobalSearchRecent();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { isLoading, topResults, bySection } = useGlobalSearchResults({
    open,
    query,
  });

  const placeholder = t("globalSearch.placeholder");
  const customChrome = stylesIncludeVisualChrome(config.styles);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        refresh();
      } else {
        setQuery("");
      }
    },
    [refresh],
  );

  const handleSelect = useCallback(
    (hit: GlobalSearchHit) => {
      remember(hit);
      handleOpenChange(false);
      if (previewMode) {
        return;
      }
      void navigate(hit.to);
    },
    [handleOpenChange, navigate, previewMode, remember],
  );

  const goToResults = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const queryHit = buildGlobalSearchQueryHit(trimmed);
      if (queryHit) {
        remember(queryHit);
      }
      handleOpenChange(false);
      if (previewMode) {
        return;
      }
      void navigate(buildGlobalSearchResultsPath({ q: trimmed }));
    },
    [handleOpenChange, navigate, previewMode, remember],
  );

  const openPanel = useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);

  const expandedWidthClassName = cn(
    "min-w-0 shrink-0 transition-[width,max-width] duration-200 ease-out motion-reduce:transition-none",
    open ? "w-[min(28rem,42vw)] max-w-[28rem]" : "w-52 max-w-[13rem]",
  );

  const panel = (
    <GlobalSearchPanel
      query={query}
      onQueryChange={setQuery}
      onQuerySubmit={goToResults}
      recent={recent}
      isLoading={isLoading}
      topResults={topResults}
      bySection={bySection}
      onSelect={handleSelect}
      onRemoveRecent={forget}
      showQueryField={!isDesktop}
      placeholder={placeholder}
      className={isDesktop ? "max-h-[min(70vh,28rem)] overflow-y-auto p-1" : ""}
    />
  );

  const triggerField = (
    <LayoutInteractiveShell
      styles={config.styles}
      label={config.label}
      className="w-full max-w-none"
    >
      {(presentation) => (
        <div
          onFocusCapture={openPanel}
          onClick={openPanel}
          className="flex w-full min-w-0 items-center gap-1"
        >
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (!open) {
                handleOpenChange(true);
              }
            }}
            onSubmit={goToResults}
            placeholder={placeholder}
            ariaLabel={placeholder}
            clearAriaLabel={t("dataView.searchClear")}
            debounceMs={0}
            className="max-w-none min-w-0 w-full flex-1"
            inputClassName={cn(
              presentation.valueClassName,
              !customChrome && interactiveSearchFieldClass(),
            )}
            inputStyle={presentation.valueStyle}
          />
          {open ? (
            <IconButton
              type="button"
              size="sm"
              label={t("globalSearch.results.submitAria")}
              onClick={(event) => {
                event.stopPropagation();
                goToResults(query);
              }}
              data-testid="global-search-submit"
            >
              <Search className="size-4" aria-hidden />
            </IconButton>
          ) : null}
        </div>
      )}
    </LayoutInteractiveShell>
  );

  if (isDesktop) {
    return (
      <Popover
        open={open}
        onOpenChange={handleOpenChange}
        openOnClick={false}
        placement="bottom-start"
        fullWidth
        title={t("globalSearch.panelTitle")}
        panelClassName="w-full max-w-none p-2"
        className={cn("block", expandedWidthClassName)}
        trigger={triggerField}
      >
        {panel}
      </Popover>
    );
  }

  return (
    <>
      <div className={expandedWidthClassName}>{triggerField}</div>
      <Modal
        open={open}
        onClose={() => handleOpenChange(false)}
        title={t("globalSearch.panelTitle")}
        size="2xl"
        responsiveSizes={{
          base: "2xl",
          sm: "2xl",
          md: "lg",
          lg: "lg",
          xl: "lg",
        }}
        scrollable
        contentPadding="default"
        closeLabel={t("globalSearch.close")}
      >
        {panel}
      </Modal>
    </>
  );
}
