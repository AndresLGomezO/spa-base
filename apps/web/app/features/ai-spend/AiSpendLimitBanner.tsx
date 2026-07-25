import { Alert } from "@repo/ui";
import { useTranslation } from "react-i18next";

interface AiSpendLimitBannerProps {
  readonly blocked: boolean;
  readonly softWarn?: boolean;
}

export function AiSpendLimitBanner({
  blocked,
  softWarn = false,
}: AiSpendLimitBannerProps) {
  const { t } = useTranslation("common");

  if (blocked) {
    return <Alert>{t("aiSpend.limitReached")}</Alert>;
  }

  if (softWarn) {
    return <Alert>{t("aiSpend.approachingLimit")}</Alert>;
  }

  return null;
}
