import { Outlet } from "react-router";

import { RequireTenant } from "../routing/RouteGuards";

export default function TenantLayoutRoute() {
  return (
    <RequireTenant>
      <Outlet />
    </RequireTenant>
  );
}
