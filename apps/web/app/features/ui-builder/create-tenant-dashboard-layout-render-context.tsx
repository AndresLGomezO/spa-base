import type { DashboardSectionDefinition } from "@repo/entities";
import { CardFieldImage } from "@repo/ui";
import type { UserComponentConfig } from "@repo/ui-builder-core";
import type { LayoutRenderContext } from "@repo/ui-builder-renderer";
import type { TFunction } from "i18next";

import {
  LayoutUserDisplay,
  type LayoutUserInfo,
} from "../../components/entity/LayoutUserDisplay";
import { LayoutLucideIcon } from "../../components/entity/LayoutLucideIcon";
import { createDashboardSectionRenderer } from "./create-dashboard-section-renderer";
import { resolveStaticImageSrc } from "@repo/entities";

interface CreateTenantDashboardLayoutRenderContextOptions {
  readonly sections: readonly DashboardSectionDefinition[];
  readonly locale: string;
  readonly t: TFunction;
  readonly user?: LayoutUserInfo | null;
}

export function createTenantDashboardLayoutRenderContext(
  options: CreateTenantDashboardLayoutRenderContextOptions,
): LayoutRenderContext {
  const { sections, locale, t, user = null } = options;
  const fallbackName = t("nav.fallbackName");

  const buildLayoutContext = (): LayoutRenderContext => ({
    mode: "listItem",
    data: {},
    locale,
    resolveField: () => undefined,
    isImagePresent: (_fieldPath, rawValue) => {
      if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
        return false;
      }
      return Boolean(resolveStaticImageSrc(rawValue));
    },
    resolveImage: (_fieldPath, rawValue, imageOptions) => {
      const src =
        typeof rawValue === "string" ? resolveStaticImageSrc(rawValue) : null;
      if (!src) {
        return null;
      }

      return (
        <CardFieldImage
          src={src}
          alt=""
          sizePx={imageOptions.imageSize}
          className={imageOptions.className}
          style={imageOptions.style}
        />
      );
    },
    lucideIconRenderer: (config) => <LayoutLucideIcon config={config} />,
    userRenderer: (config: UserComponentConfig) => (
      <LayoutUserDisplay
        config={config}
        user={user}
        fallbackName={fallbackName}
      />
    ),
    dashboardSectionRenderer: createDashboardSectionRenderer({
      sections,
      t,
      buildLayoutContext,
    }),
  });

  return buildLayoutContext();
}
