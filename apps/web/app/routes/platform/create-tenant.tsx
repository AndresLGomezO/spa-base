import { useEffect } from "react";
import { Navigate } from "react-router";

import { useCreateTenantModal } from "../../components/platform/create-tenant-modal-context";

export default function CreateTenantRedirectRoute() {
  const { openCreateTenantModal } = useCreateTenantModal();

  useEffect(() => {
    openCreateTenantModal();
  }, [openCreateTenantModal]);

  return <Navigate to="/" replace />;
}
