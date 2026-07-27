import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import {
  getPushPermissionState,
  isPushConfigured,
  requestPushPermissionAndRegisterToken,
  resolvePushRegistrationState,
} from "../../lib/firebase-messaging";
import {
  PUSH_SOFT_ASK_SNOOZE_DISMISS_MS,
  PUSH_SOFT_ASK_SNOOZE_NOT_NOW_MS,
  shouldShowPushSoftAsk,
  snoozePushSoftAsk,
} from "./push-opt-in-storage";

const SOFT_ASK_DELAY_MS = 2_000;

/** Session-scoped so React Strict Mode remounts do not double-prompt. */
const promptedThisSession = new Set<string>();

/**
 * Soft-ask for browser notification permission after login.
 * Native `Notification.requestPermission` only runs when the user clicks Enable.
 */
export function PushOptInPrompt() {
  const { t } = useTranslation("common");
  const { isReady, tenantId, user } = useAuth();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isReady || !tenantId || !user?.uid) {
      return;
    }

    const uid = user.uid;
    if (promptedThisSession.has(uid)) {
      return;
    }

    let cancelled = false;

    timerRef.current = window.setTimeout(() => {
      void run();
    }, SOFT_ASK_DELAY_MS);

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    async function run(): Promise<void> {
      if (cancelled || promptedThisSession.has(uid)) {
        return;
      }
      if (!isPushConfigured()) {
        return;
      }

      const permission = getPushPermissionState();
      if (permission === "unsupported" || permission === "denied") {
        promptedThisSession.add(uid);
        return;
      }

      if (permission === "granted") {
        promptedThisSession.add(uid);
        const state = await resolvePushRegistrationState();
        if (cancelled || state === "on") {
          return;
        }
        // Silent backfill when OS permission is already granted but no server token.
        await requestPushPermissionAndRegisterToken();
        return;
      }

      // permission === "default"
      if (!shouldShowPushSoftAsk(uid)) {
        promptedThisSession.add(uid);
        return;
      }

      promptedThisSession.add(uid);
      if (cancelled) {
        return;
      }

      let acted = false;

      toast(t("push.softAsk.title"), {
        description: t("push.softAsk.body"),
        duration: 15_000,
        action: {
          label: t("push.softAsk.enable"),
          onClick: () => {
            acted = true;
            void enable();
          },
        },
        cancel: {
          label: t("push.softAsk.notNow"),
          onClick: () => {
            acted = true;
            snoozePushSoftAsk(uid, PUSH_SOFT_ASK_SNOOZE_NOT_NOW_MS);
          },
        },
        onDismiss: () => {
          if (!acted) {
            snoozePushSoftAsk(uid, PUSH_SOFT_ASK_SNOOZE_DISMISS_MS);
          }
        },
      });
    }

    async function enable(): Promise<void> {
      const result = await requestPushPermissionAndRegisterToken();
      if (result.status === "registered") {
        toast.success(t("accountSettings.general.pushEnabledSuccess"));
        return;
      }
      if (result.status === "denied") {
        toast.info(t("accountSettings.general.pushDeniedHint"));
        return;
      }
      if (result.status === "unsupported") {
        if (result.reason === "no_service_worker") {
          toast.info(t("accountSettings.general.pushUnsupportedNoSw"));
          return;
        }
        toast.info(t("accountSettings.general.pushUnsupported"));
        return;
      }
      toast.error(result.message);
    }
  }, [isReady, tenantId, user?.uid, t]);

  return null;
}
