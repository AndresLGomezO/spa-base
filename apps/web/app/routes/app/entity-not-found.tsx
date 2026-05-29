import { Heading, Text } from "@repo/ui";
import { useTranslation } from "react-i18next";

export default function EntityNotFoundRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-2">
      <Heading level={1}>{t("error.notFound")}</Heading>
      <Text>{t("entity.notFound")}</Text>
    </div>
  );
}
