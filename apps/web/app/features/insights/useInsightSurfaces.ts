import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getInsightSurfaces } from "../../lib/api-client";

function insightSurfacesQueryKey(locale: string) {
  return ["insight-surfaces", locale] as const;
}

export function useInsightSurfaces(
  options: { readonly enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  const { i18n } = useTranslation("common");
  const locale = i18n.language?.split("-")[0] || "en";

  return useQuery({
    queryKey: insightSurfacesQueryKey(locale),
    queryFn: () => getInsightSurfaces(locale),
    enabled,
    staleTime: 60_000,
  });
}
