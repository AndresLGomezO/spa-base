import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Heading, Text } from "@repo/ui";

import type { InsightSurfaceDescriptor } from "../../lib/api-client";
import { usePermission } from "../../auth/usePermission";
import { InsightSurfaceCard } from "./InsightSurfaceCard";
import { useInsightSurface } from "./useInsightSurface";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function InsightSurfaceCarousel({
  surface,
}: {
  readonly surface: InsightSurfaceDescriptor;
}) {
  const { t } = useTranslation("common");
  const canRun = usePermission(surface.permission);
  const scope = currentMonth();
  const query = useInsightSurface({
    surfaceId: surface.id,
    scope,
    enabled: canRun,
  });

  if (!canRun) {
    return null;
  }

  if (query.isLoading) {
    return (
      <section
        className="mb-4 space-y-2 px-4 pt-4"
        data-testid={`insight-carousel-loading-${surface.id}`}
      >
        <div className="bg-muted h-4 w-40 animate-pulse rounded" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="bg-muted h-28 min-w-[16rem] animate-pulse rounded-xl"
            />
          ))}
        </div>
      </section>
    );
  }

  if (query.isError || !query.data || query.data.insights.length === 0) {
    return null;
  }

  const labels = query.data.labels;
  const seeAllHref = `/ai/insights?tab=${encodeURIComponent(surface.id)}&${encodeURIComponent(surface.scope.queryParam)}=${encodeURIComponent(scope)}`;

  return (
    <section
      className="mb-4 space-y-2 px-4 pt-4"
      data-testid={`insight-carousel-${surface.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Heading level={2} className="text-base">
          {labels.title}
        </Heading>
        <Link
          to={seeAllHref}
          className="text-primary text-sm font-medium hover:underline"
          data-testid={`insight-carousel-see-all-${surface.id}`}
        >
          {labels.seeAll ?? t("insights.seeAll")}
        </Link>
      </div>
      {labels.description ? (
        <Text className="text-muted-foreground text-xs">
          {labels.description}
        </Text>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {query.data.insights.map((insight) => (
          <InsightSurfaceCard
            key={insight.recordId}
            insight={insight}
            linkFields={query.data.linkFields}
            compact
          />
        ))}
      </div>
    </section>
  );
}
