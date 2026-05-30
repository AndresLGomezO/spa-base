import { Heading } from "@repo/ui";
import { useTranslation } from "react-i18next";

import { CreateTenantForm } from "../../components/platform/CreateTenantForm";

export default function CreateTenantRoute() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4">
      <Heading level={1}>{t("platform.createTenant.title")}</Heading>
      <CreateTenantForm />
    </div>
  );
}
