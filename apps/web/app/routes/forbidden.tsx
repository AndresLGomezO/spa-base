import { useTranslation } from "react-i18next";

import { Heading, Text } from "@repo/ui";

export default function ForbiddenRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Heading level={1}>{t("forbidden.title")}</Heading>
      <Text>{t("forbidden.description")}</Text>
    </div>
  );
}
