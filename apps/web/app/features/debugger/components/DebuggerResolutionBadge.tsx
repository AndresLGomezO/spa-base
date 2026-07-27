import { useTranslation } from "react-i18next";

import {
  hookResolutionSourceLabelKey,
  type HookResolutionSourceKey,
} from "../hook-resolution-source";

const RESOLUTION_BADGE_CLASS: Record<HookResolutionSourceKey, string> = {
  directMatch: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  embeddingMatch: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  llm: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  unresolved: "bg-muted text-muted-foreground",
};

export function DebuggerResolutionBadge({
  resolutionSource,
  size = "default",
}: {
  readonly resolutionSource?: HookResolutionSourceKey | string | null;
  readonly size?: "default" | "compact";
}) {
  const { t } = useTranslation("common");

  if (
    resolutionSource !== "directMatch" &&
    resolutionSource !== "embeddingMatch" &&
    resolutionSource !== "llm" &&
    resolutionSource !== "unresolved"
  ) {
    return null;
  }

  const label = t(hookResolutionSourceLabelKey(resolutionSource));

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md font-medium ${
        RESOLUTION_BADGE_CLASS[resolutionSource]
      } ${size === "compact" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"}`}
      title={label}
    >
      {label}
    </span>
  );
}
