import { useTranslation } from "react-i18next";
import { Heading, Text } from "@repo/ui";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { ThemeToggle } from "../../components/ThemeToggle";
import { BrowserPushNotificationsSetting } from "../../features/notifications/BrowserPushNotificationsSetting";

export default function AccountSettingsGeneralRoute() {
  const { t } = useTranslation("common");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Heading level={1}>{t("accountSettings.general.title")}</Heading>
        <Text className="text-muted-foreground">
          {t("accountSettings.general.description")}
        </Text>
      </div>
      <div className="border-border divide-border divide-y rounded-lg border">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Text className="font-medium">{t("theme.label")}</Text>
            <Text variant="caption">
              {t("accountSettings.general.themeHint")}
            </Text>
          </div>
          <div className="w-full sm:w-56">
            <ThemeToggle fullWidth />
          </div>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Text className="font-medium">{t("language.label")}</Text>
            <Text variant="caption">
              {t("accountSettings.general.languageHint")}
            </Text>
          </div>
          <div className="w-full sm:w-56">
            <LanguageSwitcher fullWidth />
          </div>
        </div>
        <BrowserPushNotificationsSetting />
      </div>
    </div>
  );
}
