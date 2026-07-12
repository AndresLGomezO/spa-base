import { Navigate, useLocation } from "react-router";

import { ACCOUNT_SETTINGS_BASE } from "../../features/account-settings/account-settings-nav";

/** Legacy path — redirects to account settings Integrations → Email. */
export default function SettingsEmailRedirect() {
  const location = useLocation();
  const search = location.search;
  return (
    <Navigate
      to={`${ACCOUNT_SETTINGS_BASE}/integrations/email${search}`}
      replace
    />
  );
}
