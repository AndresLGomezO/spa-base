import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { useAuth } from "./AuthContext";

interface GuardProps {
  readonly children: ReactNode;
}

export function RequireAuth({ children }: GuardProps) {
  const { isReady, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <p>Loading session...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: GuardProps) {
  const { isReady, isAuthenticated } = useAuth();

  if (!isReady) {
    return <p>Loading session...</p>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
