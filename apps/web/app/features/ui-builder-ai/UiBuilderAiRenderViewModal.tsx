import { Alert, Button, Modal, Text, Textarea } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { UiBuilderSuggestionRecord } from "../../lib/api-client";
import { resolveBrowserStorageUrl } from "../../lib/resolve-browser-storage-url";
import { RenderHtmlPreviewIframe } from "./RenderHtmlPreviewIframe";

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

interface RenderBriefWizardStep {
  readonly id: string;
  readonly label: string;
}

interface ParsedRenderBrief {
  readonly wizardSteps?: readonly RenderBriefWizardStep[];
}

function parseRenderBrief(
  renderBrief: string | undefined,
): ParsedRenderBrief | null {
  if (!renderBrief?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(renderBrief) as ParsedRenderBrief;
    return parsed;
  } catch {
    return null;
  }
}

interface UiBuilderAiRenderViewModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly suggestion: UiBuilderSuggestionRecord | null;
  readonly entityLabel: string;
  readonly isRefining: boolean;
  readonly onRefine: (modificationRequest: string) => void;
  readonly translationPrefix?: string;
}

export function UiBuilderAiRenderViewModal({
  open,
  onOpenChange,
  suggestion,
  entityLabel,
  isRefining,
  onRefine,
  translationPrefix = "formDesigner.ai",
}: UiBuilderAiRenderViewModalProps) {
  const { t } = useTranslation("common");
  const key = (suffix: string) => `${translationPrefix}.${suffix}` as const;
  const [modificationRequest, setModificationRequest] = useState("");
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const renderHtml = suggestion?.renderHtml;
  const parsedBrief = useMemo(
    () => parseRenderBrief(suggestion?.renderBrief),
    [suggestion?.renderBrief],
  );
  const wizardSteps = useMemo(
    () => parsedBrief?.wizardSteps ?? [],
    [parsedBrief?.wizardSteps],
  );

  useEffect(() => {
    if (!open) {
      setModificationRequest("");
      setActiveStepId(null);
      return;
    }
    if (wizardSteps.length > 0) {
      setActiveStepId(wizardSteps[0]?.id ?? null);
    }
  }, [open, suggestion?.id, wizardSteps]);

  const activeStepIndex = useMemo(() => {
    if (!activeStepId) {
      return -1;
    }
    return wizardSteps.findIndex((step) => step.id === activeStepId);
  }, [activeStepId, wizardSteps]);

  const handleStepSelect = useCallback((stepId: string) => {
    setActiveStepId(stepId);
  }, []);

  const displayImageUrl = suggestion?.imageUrl
    ? resolveBrowserStorageUrl(suggestion.imageUrl)
    : null;

  if (!renderHtml && !displayImageUrl) {
    return null;
  }

  const iterationNumber = suggestion?.iterationNumber ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={t(key("renderViewTitle") as never)}
      size="xl"
      scrollable
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRefining}
          >
            {t(key("cancel") as never)}
          </Button>
          <Button
            type="button"
            loading={isRefining}
            disabled={modificationRequest.trim().length === 0}
            onClick={() => onRefine(modificationRequest.trim())}
          >
            {t(key("renderRefineButton") as never)}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Text>{entityLabel}</Text>
          <Text>·</Text>
          <Text>
            {t(key("renderIterationLabel") as never, {
              number: iterationNumber + 1,
            })}
          </Text>
          <Text>·</Text>
          <Text>
            {formatDate(suggestion?.createdAt ?? new Date().toISOString())}
          </Text>
        </div>
        {wizardSteps.length > 0 ? (
          <div className="space-y-2">
            <Text className="text-sm text-muted-foreground">
              {t(key("renderWizardStepProgress") as never, {
                current: activeStepIndex >= 0 ? activeStepIndex + 1 : 1,
                total: wizardSteps.length,
              })}
            </Text>
            <div className="flex flex-wrap gap-2">
              {wizardSteps.map((step, index) => (
                <Button
                  key={step.id}
                  type="button"
                  size="sm"
                  variant={step.id === activeStepId ? "primary" : "outline"}
                  onClick={() => handleStepSelect(step.id)}
                >
                  {index + 1}. {step.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
          {renderHtml ? (
            <RenderHtmlPreviewIframe
              html={renderHtml}
              hashStepId={activeStepId}
              onHashStepIdChange={handleStepSelect}
              title={t(key("renderHtmlPreviewTitle") as never)}
              className="block h-[min(60vh,640px)] w-full bg-white"
            />
          ) : displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={t(key("renderImageAlt") as never)}
              className="mx-auto max-h-[60vh] w-full object-contain"
            />
          ) : null}
        </div>
        {suggestion?.critiqueNotes ? (
          <Alert>{suggestion.critiqueNotes}</Alert>
        ) : null}
        <div className="space-y-2">
          <Text className="text-sm font-medium text-foreground">
            {t(key("renderModificationLabel") as never)}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t(key("renderModificationHelper") as never)}
          </Text>
          <Textarea
            value={modificationRequest}
            onChange={(event) => setModificationRequest(event.target.value)}
            rows={4}
            placeholder={t(key("renderModificationPlaceholder") as never)}
            disabled={isRefining}
          />
        </div>
      </div>
    </Modal>
  );
}

export function isRenderSuggestion(
  suggestion: UiBuilderSuggestionRecord,
): boolean {
  return (
    suggestion.outputMode === "render" ||
    Boolean(suggestion.renderHtml) ||
    Boolean(suggestion.imageUrl)
  );
}
