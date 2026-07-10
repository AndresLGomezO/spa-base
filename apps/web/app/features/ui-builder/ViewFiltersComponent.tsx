import type { ViewFiltersComponentConfig } from "@repo/ui-builder-core";
import { FilterPanel, FilterPanelBody, useFilterPanelDismiss } from "@repo/ui";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@repo/theme/utils";

import { LayoutInteractiveShell } from "../../components/entity/LayoutInteractiveShell";
import { useEntityCatalog } from "../../entities/entity-catalog-context";
import { useOptionalViewFilterPageState } from "./view-filter-page-context";
import {
  buildActiveFilterBadges,
  buildQualifiedFilterColumnsForGroups,
  groupFiltersByEntity,
  ViewFilterEntityGroup,
} from "./view-filter-shared";

interface ViewFiltersComponentProps {
  readonly config: ViewFiltersComponentConfig;
}

export function ViewFiltersComponent({ config }: ViewFiltersComponentProps) {
  const { items } = useEntityCatalog();
  const pageState = useOptionalViewFilterPageState();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("common");

  const groups = useMemo(
    () => groupFiltersByEntity(config.filters, items),
    [config.filters, items],
  );

  const columns = useMemo(
    () => buildQualifiedFilterColumnsForGroups(groups),
    [groups],
  );

  useFilterPanelDismiss(filtersOpen, setFiltersOpen, rootRef);

  if (!pageState || config.filters.length === 0) {
    return null;
  }

  const labels = {
    removeBadge: (label: string) => t("dataView.removeBadge", { label }),
    filtersTrigger: t("dataView.filtersTrigger"),
    filtersClearAll: t("dataView.filtersClearAll"),
  };

  const activeBadges = buildActiveFilterBadges(columns, pageState);

  const filterBody = (
    <div className="flex min-w-0 w-full flex-col gap-4">
      {groups.map((group) => (
        <ViewFilterEntityGroup
          key={group.entityName}
          group={group}
          pageState={pageState}
        />
      ))}
    </div>
  );

  return (
    <LayoutInteractiveShell styles={config.styles} label={config.label}>
      {(presentation) => (
        <div
          ref={rootRef}
          className={cn(
            "w-full min-w-0 max-w-full",
            filtersOpen && "relative isolate z-30",
          )}
          data-testid="view-filters-toolbar"
        >
          <FilterPanel
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeBadges={activeBadges}
            triggerLabel={labels.filtersTrigger}
            clearAllLabel={labels.filtersClearAll}
            removeAriaLabel={labels.removeBadge}
            onClearAll={() => {
              for (const column of columns) {
                pageState.setFilter(column.id, []);
              }
            }}
            badgesBelowToolbar
            renderBody={false}
            compact
            toolbarFillWidth
            triggerClassName={presentation.valueClassName}
            triggerStyle={presentation.valueStyle}
          >
            {filterBody}
          </FilterPanel>
          <div className="mt-0 w-full min-w-0 max-w-full">
            <FilterPanelBody
              open={filtersOpen}
              onClearAll={() => {
                for (const column of columns) {
                  pageState.setFilter(column.id, []);
                }
              }}
              clearAllLabel={labels.filtersClearAll}
              disabled={false}
            >
              {filterBody}
            </FilterPanelBody>
          </div>
        </div>
      )}
    </LayoutInteractiveShell>
  );
}
