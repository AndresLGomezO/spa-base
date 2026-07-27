import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Text, toast } from "@repo/ui";

import { useAuth } from "../../auth/AuthContext";
import { isApiClientError, sendTestNotification } from "../../lib/api-client";
import { invalidateNotificationQueries } from "./notifications-query-keys";

type TestChannel = "inApp" | "push";

export function NotificationsTestPanel() {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [busyChannel, setBusyChannel] = useState<TestChannel | null>(null);

  const runTest = useCallback(
    async (channel: TestChannel) => {
      setBusyChannel(channel);
      try {
        await sendTestNotification(channel);
        if (channel === "inApp") {
          invalidateNotificationQueries(queryClient, tenantId);
          toast.success(t("accountSettings.notifications.testInAppSuccess"));
          return;
        }
        toast.success(t("accountSettings.notifications.testPushSuccess"));
      } catch (error) {
        if (
          channel === "push" &&
          isApiClientError(error) &&
          error.message === "no_push_token"
        ) {
          toast.info(t("accountSettings.notifications.testPushNoToken"));
          return;
        }
        toast.error(
          error instanceof Error
            ? error.message
            : t("accountSettings.notifications.testFailed"),
        );
      } finally {
        setBusyChannel(null);
      }
    },
    [queryClient, t, tenantId],
  );

  return (
    <div className="border-border space-y-4 rounded-lg border px-4 py-4">
      <div className="space-y-1">
        <Text className="font-medium">
          {t("accountSettings.notifications.testSectionTitle")}
        </Text>
        <Text variant="caption" className="text-muted-foreground">
          {t("accountSettings.notifications.testSectionHint")}
        </Text>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          disabled={busyChannel !== null}
          onClick={() => {
            void runTest("inApp");
          }}
        >
          {t("accountSettings.notifications.testInApp")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busyChannel !== null}
          onClick={() => {
            void runTest("push");
          }}
        >
          {t("accountSettings.notifications.testPush")}
        </Button>
      </div>
    </div>
  );
}
