import { Outlet } from "react-router";

import { RequireSuperAdmin } from "../routing/RouteGuards";

export default function SuperAdminLayoutRoute() {
  return (
    <RequireSuperAdmin>
      <Outlet />
    </RequireSuperAdmin>
  );
}
