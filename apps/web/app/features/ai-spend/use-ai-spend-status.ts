import { useQuery } from "@tanstack/react-query";

import { getAiSpendStatus, type AiSpendStatus } from "../../lib/api-client";
import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";

const AI_SPEND_STATUS_QUERY_KEY = ["ai-spend-status"] as const;

export function useAiSpendStatus(enabled = true): {
  readonly status: AiSpendStatus | undefined;
  readonly blocked: boolean;
  readonly softWarn: boolean;
  readonly isLoading: boolean;
} {
  const { tenantId, isReady } = useAuth();
  const canReadChat = usePermission("ai.chat.read");
  const canReadUiBuilder = usePermission("ai.uiBuilder.read");
  const canQuery = canReadChat || canReadUiBuilder;

  const query = useQuery({
    queryKey: [...AI_SPEND_STATUS_QUERY_KEY, tenantId],
    queryFn: () => getAiSpendStatus(),
    enabled: enabled && isReady && Boolean(tenantId) && canQuery,
    staleTime: 30_000,
  });

  return {
    status: query.data,
    blocked: query.data?.blocked === true,
    softWarn: query.data?.softWarn === true && query.data?.blocked !== true,
    isLoading: query.isLoading,
  };
}
