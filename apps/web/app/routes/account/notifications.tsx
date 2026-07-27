import { useTranslation } from "react-i18next";
import { Heading, Text } from "@repo/ui";

import { BrowserPushNotificationsSetting } from "../../features/notifications/BrowserPushNotificationsSetting";
import { NotificationsTestPanel } from "../../features/notifications/NotificationsTestPanel";

export default function AccountSettingsNotificationsRoute() {
  const { t } = useTranslation("common");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Heading level={1}>{t("accountSettings.notifications.title")}</Heading>
        <Text className="text-muted-foreground">
          {t("accountSettings.notifications.description")}
        </Text>
      </div>
      <div className="border-border divide-border divide-y rounded-lg border">
        <BrowserPushNotificationsSetting />
      </div>
      <NotificationsTestPanel />
    </div>
  );
}
