import { Navigate, useParams } from "react-router";

import { DebuggerView } from "../features/debugger/DebuggerView";
import { debugEventSourceFromRouteSlug } from "../features/debugger/debugger-source-config";
import {
  canAccessDebuggerSource,
  resolveDefaultDebuggerRoute,
} from "../routing/debugger-nav";
import { useAuth } from "../auth/AuthContext";

export default function DebuggerRoute() {
  const { sourceSlug } = useParams();
  const { permissions, isSuperAdmin } = useAuth();
  const activeSource = debugEventSourceFromRouteSlug(sourceSlug);

  if (!activeSource) {
    return (
      <Navigate
        to={resolveDefaultDebuggerRoute(permissions, isSuperAdmin)}
        replace
      />
    );
  }

  if (!canAccessDebuggerSource(activeSource, permissions, isSuperAdmin)) {
    return (
      <Navigate
        to={resolveDefaultDebuggerRoute(permissions, isSuperAdmin)}
        replace
      />
    );
  }

  return <DebuggerView activeSource={activeSource} />;
}
