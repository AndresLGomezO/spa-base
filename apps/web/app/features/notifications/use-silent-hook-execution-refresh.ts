import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthContext";
import { listDebugEvents } from "../../lib/api-client";
import { invalidateLivePageData } from "../../query/invalidate-live-page-data";

const POLL_INTERVAL_MS = 2_000;
const WATCH_GRACE_MS = 30_000;

let watchUntilMs = 0;

export function bumpHookExecutionWatch(): void {
  watchUntilMs = Date.now() + WATCH_GRACE_MS;
}

export function useSilentHookExecutionRefresh(): void {
  const { isReady, tenantId } = useAuth();
  const queryClient = useQueryClient();
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (!isReady || !tenantId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = (delayMs: number) => {
      if (cancelled) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void poll();
      }, delayMs);
    };

    const poll = async () => {
      if (cancelled) {
        return;
      }

      const graceActive = Date.now() < watchUntilMs;
      if (!wasActiveRef.current && !graceActive) {
        return;
      }

      try {
        const response = await listDebugEvents({
          limit: 20,
          sources: ["hookExecution"],
        });
        const live = response.hookExecutionLive;
        const isActive = (live?.pending ?? 0) > 0 || (live?.running ?? 0) > 0;

        if (isActive) {
          wasActiveRef.current = true;
          scheduleNext(POLL_INTERVAL_MS);
          return;
        }

        if (wasActiveRef.current) {
          wasActiveRef.current = false;
          void invalidateLivePageData(queryClient);
        }

        if (graceActive) {
          scheduleNext(POLL_INTERVAL_MS);
        }
      } catch {
        if (graceActive || wasActiveRef.current) {
          scheduleNext(POLL_INTERVAL_MS);
        }
      }
    };

    scheduleNext(0);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isReady, queryClient, tenantId]);
}
