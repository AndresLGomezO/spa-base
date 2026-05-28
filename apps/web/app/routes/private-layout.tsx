import { Outlet } from "react-router";

import { RequireAuth } from "../auth/AuthGuards";

export default function PrivateLayoutRoute() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}
