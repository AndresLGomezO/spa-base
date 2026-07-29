import type { ReactNode } from "react";

interface EntityPageCompactMetricsProps {
  readonly children: ReactNode;
}

export function EntityPageCompactMetrics({
  children,
}: EntityPageCompactMetricsProps) {
  return <div className="shrink-0">{children}</div>;
}
