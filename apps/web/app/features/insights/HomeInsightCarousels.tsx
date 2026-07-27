import { useMemo } from "react";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { InsightSurfaceCarousel } from "./InsightSurfaceCarousel";
import { useInsightSurfaces } from "./useInsightSurfaces";

export function HomeInsightCarousels() {
  const { isReady, tenantId } = useAuth();
  const canList = usePermission("ai.chat.run");
  const enabled = isReady && Boolean(tenantId) && canList;
  const surfacesQuery = useInsightSurfaces({ enabled });

  const homeSurfaces = useMemo(() => {
    const surfaces = surfacesQuery.data?.surfaces ?? [];
    return [...surfaces]
      .filter((surface) => surface.ui.showInHome)
      .sort((a, b) => a.ui.homeOrder - b.ui.homeOrder);
  }, [surfacesQuery.data?.surfaces]);

  if (!enabled || surfacesQuery.isError) {
    return null;
  }

  if (surfacesQuery.isLoading) {
    return (
      <section
        className="mb-4 space-y-2 px-4 pt-4"
        data-testid="home-insight-carousels-loading"
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

  if (homeSurfaces.length === 0) {
    return null;
  }

  return (
    <>
      {homeSurfaces.map((surface) => (
        <InsightSurfaceCarousel key={surface.id} surface={surface} />
      ))}
    </>
  );
}
