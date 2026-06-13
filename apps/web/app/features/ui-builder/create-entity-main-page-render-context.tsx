import type { ComponentType } from "react";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { SerializableEntityDefinition } from "@repo/entities";
import { metricStripHasContent } from "@repo/entities";
import type { UiLayoutDocument } from "@repo/ui-builder-core";

import type { EntityName } from "../../entities/entity-catalog";
import { WebDataViewToolbar } from "../../components/data-view/WebDataViewToolbar";
import { EntityViewMetricsStrip } from "../../components/metrics/EntityViewMetricsStrip";
import { EntityPageCompactMetrics } from "../../components/entity/EntityPageCompactMetrics";
import { EntityPageCompactToolbar } from "../../components/entity/EntityPageCompactToolbar";
import { EntityPageListScrollContainer } from "../../components/entity/entity-page-scroll-compact";
import { Heading, Button } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
import { createDefaultMetricRowLayout } from "./create-default-metric-row-layout";

interface MainPageRenderContextInput {
  readonly entityName: EntityName;
  readonly entityLabel: string;
  readonly locale: string;
  readonly canCreate: boolean;
  readonly metricRowLayout?: UiLayoutDocument;
  readonly entityDefinition: SerializableEntityDefinition;
  readonly listFilters: Readonly<Record<string, readonly string[]>>;
  readonly routeParams: Readonly<Record<string, string | undefined>>;
  readonly toolbar: React.ComponentProps<typeof WebDataViewToolbar>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly ViewComponent: ComponentType<any>;
  readonly listViewProps: Record<string, unknown>;
  readonly onCreate: () => void;
  readonly previewMode?: boolean;
  readonly metricsDesignerPath?: string;
  readonly registerPageListScrollElement?: (
    element: HTMLElement | null,
  ) => void;
}

export function createEntityMainPageRenderContext(
  input: MainPageRenderContextInput,
): LayoutRenderContext {
  const {
    entityName,
    entityLabel,
    metricRowLayout,
    entityDefinition,
    listFilters,
    routeParams,
    toolbar,
    ViewComponent,
    listViewProps,
    onCreate,
    canCreate,
    previewMode = false,
    metricsDesignerPath,
    registerPageListScrollElement,
  } = input;

  const rowLayout = metricRowLayout ?? createDefaultMetricRowLayout();
  const showMetricsRow = metricStripHasContent(rowLayout);

  return {
    mode: "mainPage",
    data: {},
    locale: input.locale,
    resolveField: () => undefined,
    pageToolbarRenderer: () => <EntityPageCompactToolbar toolbar={toolbar} />,
    pageMetricsRenderer: () =>
      showMetricsRow ? (
        <EntityPageCompactMetrics>
          <EntityViewMetricsStrip
            rowLayout={rowLayout}
            entityDefinition={entityDefinition}
            context={{ listFilters, routeParams }}
            locale={input.locale}
            previewMode={previewMode}
          />
        </EntityPageCompactMetrics>
      ) : previewMode ? (
        <MetricsPreviewPlaceholder metricsDesignerPath={metricsDesignerPath} />
      ) : null,
    pageListRenderer: () =>
      previewMode ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-6 text-sm">
          List view (configured in Item list designer; renders on the entity
          page)
        </div>
      ) : (
        <ViewComponent {...listViewProps} />
      ),
    pageHeaderRenderer: () => (
      <MainPageHeaderPreview
        entityName={entityName}
        entityLabel={entityLabel}
        canCreate={canCreate}
        onCreate={onCreate}
        previewMode={previewMode}
      />
    ),
    registerPageListScrollElement,
    wrapPageListScroll: (listContent) => (
      <EntityPageListScrollContainer>
        {listContent}
      </EntityPageListScrollContainer>
    ),
  };
}

function MetricsPreviewPlaceholder({
  metricsDesignerPath,
}: {
  readonly metricsDesignerPath?: string;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
      {metricsDesignerPath ? (
        <>
          {t("designLayout.metricsConfigureLink")}{" "}
          <Link
            to={metricsDesignerPath}
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("nav.designLayoutMetrics")}
          </Link>
        </>
      ) : (
        t("designLayout.metricsConfigureLink")
      )}
    </div>
  );
}

function MainPageHeaderPreview({
  entityName,
  entityLabel,
  canCreate,
  onCreate,
  previewMode,
}: {
  readonly entityName: EntityName;
  readonly entityLabel: string;
  readonly canCreate: boolean;
  readonly onCreate: () => void;
  readonly previewMode: boolean;
}) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const canConfigureView = useAnyPermission(
    ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS,
  );

  return (
    <div className="flex items-center justify-between gap-4">
      <Heading level={1}>{entityLabel}</Heading>
      <div className="flex items-center gap-2">
        {canConfigureView && !previewMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(designLayoutEntityPath("main", entityName))}
          >
            {t("entity.openDesignLayout")}
          </Button>
        ) : null}
        {canCreate && !previewMode ? (
          <Button type="button" onClick={onCreate}>
            {t("entity.create")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
