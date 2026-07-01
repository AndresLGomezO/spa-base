import { Navigate } from "react-router";

import { useAuth } from "../auth/AuthContext";
import { resolveDefaultDebuggerRoute } from "../routing/debugger-nav";

export default function DebuggerIndexRedirectRoute() {
  const { permissions, isSuperAdmin } = useAuth();
  const target = resolveDefaultDebuggerRoute(permissions, isSuperAdmin);
  return <Navigate to={target} replace />;
}
