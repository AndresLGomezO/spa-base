import { Navigate } from "react-router";

import { usePermission } from "../../auth/usePermission";

export default function SettingsAiContextIndexRoute() {
  const canReadSections = usePermission("aiContextSection.read");
  const canReadTemplates = usePermission("aiRecordSummaryTemplate.read");

  if (canReadSections) {
    return <Navigate to="/settings/ai-context/sections" replace />;
  }
  if (canReadTemplates) {
    return <Navigate to="/settings/ai-context/record-summaries" replace />;
  }
  return <Navigate to="/settings/ai-context/sections" replace />;
}
