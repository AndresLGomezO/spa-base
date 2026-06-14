import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { AiJobRecord } from "../../lib/api-client";
import { buildUiBuilderProgressTimeline } from "./build-ui-builder-progress-timeline";

export function useUiBuilderAiProgressTimeline(
  surface: "list" | "forms",
  job: AiJobRecord | null | undefined,
) {
  const { t } = useTranslation("common");

  return useMemo(
    () =>
      buildUiBuilderProgressTimeline({
        surface,
        status: job?.status ?? "pending",
        progress: job?.progress,
        draft: job?.draft,
        t: (key, params) => String(t(key as never, params as never)),
      }),
    [surface, job?.progress, job?.draft, job?.status, t],
  );
}
