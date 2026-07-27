import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@repo/ui";

import { getInsights, refreshInsights } from "../../lib/api-client";
import { useAiSpendActionGuard } from "../ai-spend/use-ai-spend-action-guard";

function insightSurfaceQueryKey(
  surfaceId: string,
  scope: string,
  locale: string,
) {
  return ["insight-surface", surfaceId, scope, locale] as const;
}

export function useInsightSurface(options: {
  readonly surfaceId: string;
  readonly scope: string;
  readonly enabled?: boolean;
}) {
  const { surfaceId, scope, enabled = true } = options;
  const { i18n } = useTranslation("common");
  const locale = i18n.language?.split("-")[0] || "en";

  return useQuery({
    queryKey: insightSurfaceQueryKey(surfaceId, scope, locale),
    queryFn: () => getInsights(surfaceId, scope, locale),
    enabled: enabled && Boolean(surfaceId) && Boolean(scope),
    staleTime: 30_000,
  });
}

export function useRefreshInsightSurface(options: {
  readonly surfaceId: string;
  readonly scope: string;
  readonly enabled?: boolean;
  readonly onSuccess?: (result: {
    readonly surfaceId: string;
    readonly scope: string;
    readonly enqueued: number;
    readonly alreadyCurrent: number;
  }) => void;
}) {
  const { surfaceId, scope, enabled = true, onSuccess } = options;
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language?.split("-")[0] || "en";
  const queryClient = useQueryClient();
  const { beforeAiAction, handleAiActionError, blocked } =
    useAiSpendActionGuard(enabled);

  const mutation = useMutation({
    mutationFn: () => refreshInsights(surfaceId, scope),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: insightSurfaceQueryKey(surfaceId, scope, locale),
      });
      if (result.enqueued > 0) {
        toast.success(t("insights.refreshQueued"));
      } else {
        toast.success(t("insights.refreshNoop"));
      }
      onSuccess?.(result);
    },
    onError: (error) => {
      if (!handleAiActionError(error)) {
        toast.error(t("insights.refreshFailed"));
      }
    },
  });

  function refresh(): boolean {
    if (!beforeAiAction()) {
      return false;
    }
    mutation.mutate();
    return true;
  }

  return {
    refresh,
    refreshing: mutation.isPending,
    blocked,
  };
}
