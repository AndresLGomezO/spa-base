import { Text } from "@repo/ui";
import { EmbeddedLayoutRenderer } from "@repo/ui-builder-renderer";
import {
  resolveDashboardSectionShellClassName,
  type DashboardSectionComponentConfig,
} from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { DashboardSectionDefinition } from "@repo/entities";
import type { TFunction } from "i18next";

interface CreateDashboardSectionRendererOptions {
  readonly sections: readonly DashboardSectionDefinition[];
  readonly t: TFunction;
  readonly buildLayoutContext: () => LayoutRenderContext;
}

export function createDashboardSectionRenderer(
  options: CreateDashboardSectionRendererOptions,
) {
  const { sections, t, buildLayoutContext } = options;

  return (config: DashboardSectionComponentConfig) => {
    if (!config.sectionId) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("dashboardLayoutDesigner.sectionComponent.unconfigured")}
        </Text>
      );
    }

    const section = sections.find((item) => item.id === config.sectionId);

    if (!section) {
      return (
        <Text className="text-muted-foreground text-sm">
          {t("dashboardLayoutDesigner.sectionComponent.notFound")}
        </Text>
      );
    }

    return (
      <EmbeddedLayoutRenderer
        layout={section.layout}
        context={buildLayoutContext()}
        shellClassName={resolveDashboardSectionShellClassName(config.styles)}
      />
    );
  };
}
