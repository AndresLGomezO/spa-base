import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SummaryStaleIndicatorProps {
  readonly className?: string;
}

/** Discreet stale cue for summary triggers (no text badge). */
export function SummaryStaleIndicator({
  className = "",
}: SummaryStaleIndicatorProps) {
  const { t } = useTranslation("common");
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      title={t("entity.summary.outOfSyncHint")}
      aria-label={t("entity.summary.outOfSyncHint")}
    >
      <RefreshCw
        className="size-3.5 opacity-80"
        style={{ color: "#d97706" }}
        aria-hidden
      />
    </span>
  );
}
