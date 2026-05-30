import { useTranslation } from "react-i18next";

import { Text } from "@repo/ui";

import { FormModal } from "../forms/FormModal";
import { CreateTenantForm } from "./CreateTenantForm";
import { useCreateTenantModal } from "./create-tenant-modal-context";

export function CreateTenantModal() {
  const { t } = useTranslation("common");
  const { open, closeCreateTenantModal } = useCreateTenantModal();

  return (
    <FormModal
      open={open}
      onClose={closeCreateTenantModal}
      title={t("platform.createTenant.title")}
      size="md"
    >
      <Text>{t("platform.createTenant.description")}</Text>
      <CreateTenantForm
        onCancel={closeCreateTenantModal}
        onCreated={closeCreateTenantModal}
      />
    </FormModal>
  );
}
