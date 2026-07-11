import { Navigate } from "react-router";

/** Legacy path — App shell lives at /settings/design-layout/app-shell. */
export default function DesignLayoutSidebarRedirect() {
  return <Navigate to="/settings/design-layout/app-shell" replace />;
}
