import {
  createDesignLayoutSliceEnvelope,
  validateDesignLayoutSlice,
  type DesignLayoutSliceData,
  type FormsSliceData,
  type SerializableEntityDefinition,
} from "@repo/entities";
import { AiBuilderLoadingIcon, AiSparkIcon, IconButton } from "@repo/ui";
import { cn } from "@repo/theme/utils";
import { History } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { appConfig } from "../../config/app-config";
import type {
  AiJobRecord,
  UiBuilderSuggestionRecord,
} from "../../lib/api-client";
import type { UseEntityFormLayoutEditorResult } from "../ui-builder/use-entity-form-layout-editor";
import { toValidationEntity } from "../ui-builder/to-validation-entity";
import { mergeFormsSliceForApply } from "../ui-builder-ai/merge-forms-slice-for-apply";
import { UiBuilderAiProgressPopover } from "../ui-builder-ai/UiBuilderAiProgressPopover";
import {
  UiBuilderAiRenderViewModal,
  isRenderSuggestion,
} from "../ui-builder-ai/UiBuilderAiRenderViewModal";
import {
  UiBuilderAiRequestModal,
  type UiBuilderAiRequestMode,
} from "../ui-builder-ai/UiBuilderAiRequestModal";
import { UiBuilderAiResultPopover } from "../ui-builder-ai/UiBuilderAiResultPopover";
import { UiBuilderAiSuggestionsPopover } from "../ui-builder-ai/UiBuilderAiSuggestionsPopover";
import { useUiBuilderAiProgressPopoverState } from "../ui-builder-ai/use-ui-builder-ai-progress-popover-state";
import { useUiBuilderAiProgressTimeline } from "../ui-builder-ai/use-ui-builder-ai-progress-timeline";
import {
  findSuggestionByJobId,
  resolveLastUiBuilderRunDisplay,
  useInvalidateUiBuilderAiSuggestions,
  useSubmitAiUiBuilderJob,
  useUiBuilderAiSuggestions,
} from "../ui-builder-ai/use-ai-ui-builder";
import { usePersistedUiBuilderAiJob } from "../ui-builder-ai/use-persisted-ui-builder-ai-job";

const TRANSLATION_PREFIX = "formDesigner.ai";

interface FormDesignerAiControlsProps {
  readonly entityName: string;
  readonly entityLabel: string;
  readonly definition: SerializableEntityDefinition;
  readonly editor: UseEntityFormLayoutEditorResult;
}

function buildLayoutPayload(editor: UseEntityFormLayoutEditorResult): string {
  return JSON.stringify(
    createDesignLayoutSliceEnvelope("forms", editor.exportSlice()),
  );
}

export function FormDesignerAiControls({
  entityName,
  entityLabel,
  definition,
  editor,
}: FormDesignerAiControlsProps) {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const canRun = usePermission("ai.uiBuilder.run");
  const canRead = usePermission("ai.uiBuilder.read");

  const [requestOpen, setRequestOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renderViewOpen, setRenderViewOpen] = useState(false);
  const [resultSuggestion, setResultSuggestion] =
    useState<UiBuilderSuggestionRecord | null>(null);
  const [viewSuggestion, setViewSuggestion] =
    useState<UiBuilderSuggestionRecord | null>(null);
  const [refineParentId, setRefineParentId] = useState<string | null>(null);

  const submitMutation = useSubmitAiUiBuilderJob();
  const structureJob = usePersistedUiBuilderAiJob(
    tenantId,
    entityName,
    "forms",
    "structure",
  );
  const renderJob = usePersistedUiBuilderAiJob(
    tenantId,
    entityName,
    "forms",
    "render",
  );

  const isWorking = structureJob.isWorking || renderJob.isWorking;
  const hasActiveJob = structureJob.hasActiveJob || renderJob.hasActiveJob;
  const activeJobBundle = renderJob.isWorking
    ? renderJob
    : structureJob.isWorking
      ? structureJob
      : renderJob.lastRun &&
          (!structureJob.lastRun ||
            renderJob.lastRun.finishedAt >= structureJob.lastRun.finishedAt)
        ? renderJob
        : structureJob;

  const { job, lastRun } = activeJobBundle;

  const suggestionsQuery = useUiBuilderAiSuggestions(
    entityName,
    "forms",
    canRead,
  );
  const invalidateSuggestions = useInvalidateUiBuilderAiSuggestions();
  const progressTimeline = useUiBuilderAiProgressTimeline("forms", job);
  const { progressOpen, onProgressOpenChange, onProgressHoverOpenChange } =
    useUiBuilderAiProgressPopoverState(isWorking);

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

  const handledJobIdsRef = useRef<Set<string>>(new Set());
  const requestModes = useMemo((): readonly UiBuilderAiRequestMode[] => {
    if (appConfig.formsAiRender) {
      return ["structure", "render"];
    }
    return ["structure"];
  }, []);

  const applySuggestion = useCallback(
    (suggestion: UiBuilderSuggestionRecord) => {
      if (!suggestion.sliceData || isRenderSuggestion(suggestion)) {
        return;
      }

      const entity = toValidationEntity(definition);
      const validation = validateDesignLayoutSlice(
        entity,
        "forms",
        suggestion.sliceData as DesignLayoutSliceData,
        definition.ui,
      );
      if (!validation.ok) {
        return;
      }

      const merged = mergeFormsSliceForApply(
        editor.exportSlice(),
        validation.data as FormsSliceData,
      );
      editor.applySlice(merged);
      setResultOpen(false);
      setHistoryOpen(false);
    },
    [definition, editor],
  );

  const openRenderView = useCallback(
    (suggestion: UiBuilderSuggestionRecord) => {
      setViewSuggestion(suggestion);
      setRenderViewOpen(true);
      setResultOpen(false);
      setHistoryOpen(false);
    },
    [],
  );

  const submitAiJob = useCallback(
    (
      mode: UiBuilderAiRequestMode,
      userContext: string,
      options?: {
        readonly parentSuggestionId?: string;
        readonly modificationRequest?: string;
        readonly keepRenderViewOpen?: boolean;
      },
    ) => {
      const defaultPromptKey =
        mode === "render"
          ? `${TRANSLATION_PREFIX}.renderDefaultPrompt`
          : `${TRANSLATION_PREFIX}.defaultPrompt`;
      const question = options?.modificationRequest?.trim()
        ? options.modificationRequest.trim()
        : userContext.length > 0
          ? userContext
          : t(defaultPromptKey as never);
      const setJobId =
        mode === "render"
          ? renderJob.setActiveJobId
          : structureJob.setActiveJobId;

      submitMutation.mutate(
        {
          entityName,
          surface: "forms",
          presentationHint: editor.presentation,
          outputMode: mode,
          currentLayoutJson: buildLayoutPayload(editor),
          question,
          ...(mode === "structure" && appConfig.formsAiCreative
            ? { allowCreative: true }
            : {}),
          ...(options?.parentSuggestionId
            ? { parentSuggestionId: options.parentSuggestionId }
            : {}),
          ...(options?.modificationRequest
            ? { modificationRequest: options.modificationRequest }
            : {}),
        },
        {
          onSuccess: (data) => {
            if (!options?.keepRenderViewOpen) {
              setRequestOpen(false);
            }
            setJobId(data.jobId);
            handledJobIdsRef.current.delete(data.jobId);
            setResultSuggestion(null);
            setResultOpen(false);
            setHoverOpen(false);
            if (options?.parentSuggestionId) {
              setRefineParentId(options.parentSuggestionId);
            }
          },
        },
      );
    },
    [
      editor,
      entityName,
      renderJob.setActiveJobId,
      structureJob.setActiveJobId,
      submitMutation,
      t,
    ],
  );

  useEffect(() => {
    const bundles: Array<{
      readonly activeJobId: string | null;
      readonly job: AiJobRecord | undefined;
      readonly setActiveJobId: (jobId: string | null) => void;
    }> = [
      {
        activeJobId: structureJob.activeJobId,
        job: structureJob.job,
        setActiveJobId: structureJob.setActiveJobId,
      },
      {
        activeJobId: renderJob.activeJobId,
        job: renderJob.job,
        setActiveJobId: renderJob.setActiveJobId,
      },
    ];

    for (const bundle of bundles) {
      if (
        !bundle.job ||
        !bundle.activeJobId ||
        handledJobIdsRef.current.has(bundle.activeJobId)
      ) {
        continue;
      }

      if (bundle.job.status !== "completed" && bundle.job.status !== "failed") {
        continue;
      }

      handledJobIdsRef.current.add(bundle.activeJobId);
      void invalidateSuggestions(entityName, "forms").then(async () => {
        const suggestions = suggestionsQuery.data ?? [];
        const matched = findSuggestionByJobId(suggestions, bundle.activeJobId!);
        if (matched) {
          setResultSuggestion(matched);
          if (isRenderSuggestion(matched)) {
            setViewSuggestion(matched);
            if (refineParentId) {
              setRenderViewOpen(true);
              setRefineParentId(null);
            } else {
              setResultOpen(true);
            }
          } else {
            setResultOpen(true);
          }
          return;
        }

        const refreshed = await suggestionsQuery.refetch();
        const latest = findSuggestionByJobId(
          refreshed.data ?? [],
          bundle.activeJobId!,
        );
        setResultSuggestion(latest ?? null);
        if (latest && isRenderSuggestion(latest)) {
          setViewSuggestion(latest);
          setRenderViewOpen(true);
        } else {
          setResultOpen(true);
        }
      });
    }
  }, [
    entityName,
    invalidateSuggestions,
    refineParentId,
    renderJob.activeJobId,
    renderJob.job,
    renderJob.setActiveJobId,
    structureJob.activeJobId,
    structureJob.job,
    structureJob.setActiveJobId,
    suggestionsQuery,
  ]);

  const progressLabel =
    job?.progress?.stepLabel ?? t(`${TRANSLATION_PREFIX}.designingLayout`);

  const aiButtonLabel = useMemo(() => {
    if (!isWorking) {
      return t(`${TRANSLATION_PREFIX}.openLabel`);
    }
    if (job?.progress) {
      return t(`${TRANSLATION_PREFIX}.stepProgress`, {
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
          disabled={!canRun && !isWorking}
          className={cn(
            "bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
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
      label={t(`${TRANSLATION_PREFIX}.historyLabel`)}
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
            onView={openRenderView}
            translationPrefix={TRANSLATION_PREFIX}
          />
        ) : null}
        {canRun ? (
          <>
            {isWorking ? (
              <UiBuilderAiProgressPopover
                open={progressOpen}
                onOpenChange={onProgressOpenChange}
                hoverable
                onHoverOpenChange={onProgressHoverOpenChange}
                trigger={<span className="inline-flex">{aiButton}</span>}
                timeline={progressTimeline}
                progress={job?.progress}
                jobError={job?.status === "failed" ? job.error : null}
              />
            ) : (
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
                onView={openRenderView}
                translationPrefix={TRANSLATION_PREFIX}
              />
            )}
            <UiBuilderAiRequestModal
              open={requestOpen}
              onOpenChange={setRequestOpen}
              entityLabel={entityLabel}
              isSubmitting={submitMutation.isPending || isWorking}
              jobInProgress={hasActiveJob}
              modes={requestModes}
              translationPrefix={TRANSLATION_PREFIX}
              onSubmit={(userContext, mode) => {
                submitAiJob(mode, userContext);
              }}
            />
            <UiBuilderAiRenderViewModal
              open={renderViewOpen}
              onOpenChange={setRenderViewOpen}
              suggestion={viewSuggestion}
              entityLabel={entityLabel}
              isRefining={renderJob.isWorking || submitMutation.isPending}
              translationPrefix={TRANSLATION_PREFIX}
              onRefine={(modificationRequest) => {
                if (!viewSuggestion) {
                  return;
                }
                submitAiJob("render", modificationRequest, {
                  parentSuggestionId: viewSuggestion.id,
                  modificationRequest,
                  keepRenderViewOpen: true,
                });
              }}
            />
          </>
        ) : null}
      </div>
    </>
  );
}
