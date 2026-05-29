import { Outlet } from "react-router";

import { RequireAuth } from "../routing/RouteGuards";

export default function AuthOnlyLayoutRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
