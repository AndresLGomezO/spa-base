import {
  createDesignLayoutSliceEnvelope,
  validateDesignLayoutSlice,
  type DesignLayoutSliceData,
  type ListSliceData,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { AiBuilderLoadingIcon, AiSparkIcon, IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { History } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import type { UseEntityListLayoutEditorResult } from "../ui-builder/use-entity-list-layout-editor";
import { toValidationEntity } from "../ui-builder/to-validation-entity";
import { mergeListSliceForApply } from "../ui-builder-ai/merge-list-slice-for-apply";
import { UiBuilderAiRequestModal } from "../ui-builder-ai/UiBuilderAiRequestModal";
import { UiBuilderAiResultPopover } from "../ui-builder-ai/UiBuilderAiResultPopover";
import { UiBuilderAiSuggestionsPopover } from "../ui-builder-ai/UiBuilderAiSuggestionsPopover";
import {
  findSuggestionByJobId,
  resolveLastUiBuilderRunDisplay,
  useInvalidateUiBuilderAiSuggestions,
  useSubmitAiUiBuilderJob,
  useUiBuilderAiSuggestions,
} from "../ui-builder-ai/use-ai-ui-builder";
import { usePersistedUiBuilderAiJob } from "../ui-builder-ai/use-persisted-ui-builder-ai-job";

interface ItemListDesignerAiControlsProps {
  readonly entityName: string;
  readonly entityLabel: string;
  readonly definition: SerializableEntityDefinition;
  readonly editor: UseEntityListLayoutEditorResult;
}

export function ItemListDesignerAiControls({
  entityName,
  entityLabel,
  definition,
  editor,
}: ItemListDesignerAiControlsProps) {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const canRun = usePermission("ai.uiBuilder.run");
  const canRead = usePermission("ai.uiBuilder.read");

  const [requestOpen, setRequestOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resultSuggestion, setResultSuggestion] =
    useState<UiBuilderSuggestionRecord | null>(null);

  const submitMutation = useSubmitAiUiBuilderJob();
  const { activeJobId, setActiveJobId, job, lastRun, isWorking, hasActiveJob } =
    usePersistedUiBuilderAiJob(tenantId, entityName, "list");
  const suggestionsQuery = useUiBuilderAiSuggestions(
    entityName,
    "list",
    canRead,
  );
  const invalidateSuggestions = useInvalidateUiBuilderAiSuggestions();

  const lastRunDisplay = useMemo(
    () => resolveLastUiBuilderRunDisplay(lastRun, suggestionsQuery.data ?? []),
    [lastRun, suggestionsQuery.data],
  );

  const previewOpen =
    !isWorking && lastRunDisplay != null && (resultOpen || hoverOpen);

  const previewJobError = useMemo(() => {
    if (resultSuggestion) {
      return job?.status === "failed" ? job.error : null;
    }
    return lastRunDisplay?.jobError ?? null;
  }, [job?.error, job?.status, lastRunDisplay?.jobError, resultSuggestion]);

  const handledJobIdRef = useRef<string | null>(null);

  const applySuggestion = useCallback(
    (suggestion: UiBuilderSuggestionRecord) => {
      if (!suggestion.sliceData) {
        return;
      }

      const entity = toValidationEntity(definition);
      const validation = validateDesignLayoutSlice(
        entity,
        "list",
        suggestion.sliceData as DesignLayoutSliceData,
        definition.ui,
      );
      if (!validation.ok) {
        return;
      }

      const merged = mergeListSliceForApply(
        editor.exportSlice(),
        validation.data as ListSliceData,
      );
      editor.applySlice(merged);
      setResultOpen(false);
      setHistoryOpen(false);
    },
    [definition, editor],
  );

  useEffect(() => {
    if (!job || !activeJobId || handledJobIdRef.current === activeJobId) {
      return;
    }

    if (job.status !== "completed" && job.status !== "failed") {
      return;
    }

    handledJobIdRef.current = activeJobId;
    void invalidateSuggestions(entityName, "list").then(async () => {
      const suggestions = suggestionsQuery.data ?? [];
      const matched = findSuggestionByJobId(suggestions, activeJobId);
      if (matched) {
        setResultSuggestion(matched);
        setResultOpen(true);
        return;
      }

      const refreshed = await suggestionsQuery.refetch();
      const latest = findSuggestionByJobId(refreshed.data ?? [], activeJobId);
      setResultSuggestion(latest ?? null);
      setResultOpen(true);
    });
  }, [activeJobId, entityName, invalidateSuggestions, job, suggestionsQuery]);

  const progressLabel =
    job?.progress?.stepLabel ?? t("itemListDesigner.ai.designingLayout");

  const aiButtonLabel = useMemo(() => {
    if (!isWorking) {
      return t("itemListDesigner.ai.openLabel");
    }
    if (job?.progress) {
      return t("itemListDesigner.ai.stepProgress", {
        current: job.progress.stepIndex,
        total: job.progress.totalSteps,
        label: job.progress.stepLabel,
      });
    }
    return progressLabel;
  }, [isWorking, job?.progress, progressLabel, t]);

  const aiButton = useMemo(
    () => (
      <div className="flex flex-col items-center gap-0.5">
        <IconButton
          type="button"
          size="sm"
          label={aiButtonLabel}
          disabled={!canRun || isWorking}
          className={cn(
            "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
            isWorking && "pointer-events-none",
          )}
          onClick={() => {
            if (!hasActiveJob) {
              setRequestOpen(true);
            }
          }}
        >
          {isWorking ? (
            <AiBuilderLoadingIcon size={18} label={progressLabel} />
          ) : (
            <AiSparkIcon size={18} />
          )}
        </IconButton>
        {isWorking && job?.progress ? (
          <span className="max-w-28 truncate text-[10px] text-muted-foreground">
            {job.progress.stepLabel}
          </span>
        ) : null}
      </div>
    ),
    [
      aiButtonLabel,
      canRun,
      hasActiveJob,
      isWorking,
      job?.progress,
      progressLabel,
    ],
  );

  const historyButton = (
    <IconButton
      type="button"
      size="sm"
      label={t("itemListDesigner.ai.historyLabel")}
      disabled={!canRead || isWorking}
      onClick={() => setHistoryOpen(true)}
    >
      <History className="size-4" />
    </IconButton>
  );

  if (!canRun && !canRead) {
    return null;
  }

  return (
    <>
      <div className="flex items-end gap-1">
        {canRead ? (
          <UiBuilderAiSuggestionsPopover
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            trigger={historyButton}
            suggestions={suggestionsQuery.data ?? []}
            isLoading={suggestionsQuery.isLoading}
            onApply={applySuggestion}
          />
        ) : null}
        {canRun ? (
          <>
            <UiBuilderAiResultPopover
              open={previewOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setResultOpen(false);
                  setHoverOpen(false);
                }
              }}
              hoverable={lastRunDisplay != null && !isWorking}
              openOnClick={false}
              onHoverOpenChange={setHoverOpen}
              trigger={aiButton}
              suggestion={
                resultSuggestion ?? lastRunDisplay?.suggestion ?? null
              }
              jobError={previewJobError}
              finishedAt={lastRunDisplay?.finishedAt ?? null}
              onApply={applySuggestion}
            />
            <UiBuilderAiRequestModal
              open={requestOpen}
              onOpenChange={setRequestOpen}
              entityLabel={entityLabel}
              isSubmitting={submitMutation.isPending || isWorking}
              jobInProgress={hasActiveJob}
              onSubmit={(userContext) => {
                const question =
                  userContext.length > 0
                    ? userContext
                    : t("itemListDesigner.ai.defaultPrompt");
                submitMutation.mutate(
                  {
                    entityName,
                    surface: "list",
                    currentLayoutJson: JSON.stringify(
                      createDesignLayoutSliceEnvelope(
                        "list",
                        editor.exportSlice(),
                      ),
                    ),
                    question,
                  },
                  {
                    onSuccess: (data) => {
                      setRequestOpen(false);
                      setActiveJobId(data.jobId);
                      handledJobIdRef.current = null;
                      setResultSuggestion(null);
                      setResultOpen(false);
                      setHoverOpen(false);
                    },
                  },
                );
              }}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
