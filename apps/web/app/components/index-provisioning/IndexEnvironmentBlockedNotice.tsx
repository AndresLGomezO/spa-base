import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Alert } from "@repo/ui";

import { DEBUGGER_MATCH_PATH } from "../../routing/debugger-nav";

type IndexEnvironmentBlockedFeature =
  | "import"
  | "backfill"
  | "saveDefinition"
  | "generic";

interface IndexEnvironmentBlockedNoticeProps {
  readonly feature?: IndexEnvironmentBlockedFeature;
  readonly buildingCollections?: readonly string[];
}

export function IndexEnvironmentBlockedNotice({
  feature = "generic",
  buildingCollections = [],
}: IndexEnvironmentBlockedNoticeProps) {
  const { t } = useTranslation("common");
  const collectionsLabel =
    buildingCollections.length > 0 ? buildingCollections.join(", ") : undefined;

  return (
    <Alert>
      <p className="font-medium">
        {t(`indexProvisioning.environmentBlocked.${feature}.title`)}
      </p>
      <p className="text-sm">
        {t(`indexProvisioning.environmentBlocked.${feature}.description`, {
          collections: collectionsLabel,
        })}
      </p>
      <p className="text-sm">
        {t("indexProvisioning.environmentBlocked.retryHint")}{" "}
        <Link
          to={`${DEBUGGER_MATCH_PATH}/index-provisioning`}
          className="underline"
        >
          {t("indexProvisioning.environmentBlocked.debuggerLink")}
        </Link>
      </p>
    </Alert>
  );
}
