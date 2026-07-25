import { useQueryClient } from "@tanstack/react-query";

import {
  notifyAiSpendLimit,
  notifyAiSpendLimitFromError,
} from "./notify-ai-spend-limit";
import { useAiSpendStatus } from "./use-ai-spend-status";

const AI_SPEND_STATUS_QUERY_KEY = ["ai-spend-status"] as const;

/**
 * Spend status plus helpers for AI trigger paths.
 * Notices appear only when an AI action is attempted (or the API rejects with spend_limit).
 */
export function useAiSpendActionGuard(enabled = true) {
  const queryClient = useQueryClient();
  const spend = useAiSpendStatus(enabled);

  function refreshSpendStatus() {
    void queryClient.invalidateQueries({ queryKey: AI_SPEND_STATUS_QUERY_KEY });
  }

  /**
   * Soft check before opening an AI entry UI (modal, etc.).
   * Shows the blocked notice when capped; does not show the soft-warn notice.
   * @returns false when the action must not proceed.
   */
  function assertAiNotBlocked(): boolean {
    if (spend.blocked) {
      notifyAiSpendLimit("blocked");
      return false;
    }
    return true;
  }

  /**
   * Call when an AI job is actually started (submit / refresh).
   * Shows blocked or approaching notices as needed.
   * @returns false when the action must not proceed (limit reached).
   */
  function beforeAiAction(): boolean {
    if (spend.blocked) {
      notifyAiSpendLimit("blocked");
      return false;
    }
    if (spend.softWarn) {
      notifyAiSpendLimit("approaching");
    }
    return true;
  }

  function handleAiActionError(error: unknown): boolean {
    const handled = notifyAiSpendLimitFromError(error);
    if (handled) {
      refreshSpendStatus();
    }
    return handled;
  }

  return {
    ...spend,
    assertAiNotBlocked,
    beforeAiAction,
    handleAiActionError,
    refreshSpendStatus,
  };
}
