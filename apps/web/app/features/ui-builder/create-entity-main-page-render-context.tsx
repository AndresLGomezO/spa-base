import type { ComponentType } from "react";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { ViewMetricWidget } from "@repo/entities";

import type { EntityName } from "../../entities/entity-catalog";
import { WebDataViewToolbar } from "../../components/data-view/WebDataViewToolbar";
import { EntityViewMetricsStrip } from "../../components/metrics/EntityViewMetricsStrip";
import { Heading, Button } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ENTITY_UI_OVERRIDE_WRITE_PERMISSIONS } from "@repo/entities";
import { useAnyPermission } from "../../auth/useAnyPermission";
import { designLayoutEntityPath } from "../../routing/design-layout-nav";
export interface MainPageRenderContextInput {
  readonly entityName: EntityName;
  readonly entityLabel: string;
  readonly locale: string;
  readonly canCreate: boolean;
  readonly metricWidgets: readonly ViewMetricWidget[];
  readonly listFilters: Readonly<Record<string, readonly string[]>>;
  readonly routeParams: Readonly<Record<string, string | undefined>>;
  readonly toolbar: React.ComponentProps<typeof WebDataViewToolbar>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly ViewComponent: ComponentType<any>;
  readonly listViewProps: Record<string, unknown>;
  readonly onCreate: () => void;
  readonly previewMode?: boolean;
}

export function createEntityMainPageRenderContext(
  input: MainPageRenderContextInput,
): LayoutRenderContext {
  const {
    entityName,
    entityLabel,
    metricWidgets,
    listFilters,
    routeParams,
    toolbar,
    ViewComponent,
    listViewProps,
    onCreate,
    canCreate,
    previewMode = false,
  } = input;

  return {
    mode: "mainPage",
    data: {},
    locale: input.locale,
    resolveField: () => undefined,
    pageToolbarRenderer: () => <WebDataViewToolbar {...toolbar} />,
    pageMetricsRenderer: () =>
      metricWidgets.length > 0 ? (
        <EntityViewMetricsStrip
          widgets={metricWidgets}
          context={{ listFilters, routeParams }}
        />
      ) : previewMode ? (
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Metrics (configure in Main View editor)
        </div>
      ) : null,
    pageListRenderer: () => <ViewComponent {...listViewProps} />,
    pageHeaderRenderer: () => (
      <MainPageHeaderPreview
        entityName={entityName}
        entityLabel={entityLabel}
        canCreate={canCreate}
        onCreate={onCreate}
        previewMode={previewMode}
      />
    ),
  };
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
