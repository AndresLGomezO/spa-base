import { Navigate } from "react-router";

import { ACCOUNT_SETTINGS_BASE } from "../../features/account-settings/account-settings-nav";

export default function AccountSettingsIndexRedirect() {
  return <Navigate to={`${ACCOUNT_SETTINGS_BASE}/general`} replace />;
}
