import { Alert, Button, Heading, Text } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { useAuth } from "../../../auth/AuthContext";
import {
  getDebugAiJob,
  getDebugAiJobChildren,
  type AiJobChildSummary,
  type AiJobModelUsage,
  type AiJobRecord,
  type AiJobStepTraceEntry,
  type DebugEvent,
} from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";
import { seedDebuggerDeepLinkEvent } from "../debugger-deep-link-seed";
import { DebuggerStatusBadge } from "../components/DebuggerStatusBadge";

type InspectorTab = "prompt" | "raw" | "parsed" | "draft";

function DetailField({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | number | undefined;
}) {
  return (
    <div>
      <Text className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </Text>
      <Text className="text-sm">{value ?? "—"}</Text>
    </div>
  );
}

function parseInputForDisplay(input: AiJobRecord["input"]): unknown {
  if (typeof input !== "object" || input == null) {
    return input;
  }

  const parsed: Record<string, unknown> = { ...input };
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") {
      continue;
    }
    if (!key.endsWith("Json") && !key.toLowerCase().includes("layout")) {
      continue;
    }
    try {
      parsed[key] = JSON.parse(value);
    } catch {
      // Keep the original string when it is not valid JSON.
    }
  }
  return parsed;
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatEstimatedCostUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatModelUsageSummary(usage: AiJobModelUsage): string {
  const parts = [usage.modelId];
  if (usage.promptTokens != null || usage.candidatesTokens != null) {
    parts.push(
      `${usage.promptTokens ?? "—"}/${usage.candidatesTokens ?? "—"} tok`,
    );
  } else if (usage.totalTokens != null) {
    parts.push(`${usage.totalTokens} tok`);
  } else if (usage.outputDimensions != null) {
    parts.push(`${usage.outputDimensions}d`);
  } else if (usage.imageCount != null) {
    parts.push(
      `${usage.imageCount} img${usage.aspectRatio ? ` · ${usage.aspectRatio}` : ""}`,
    );
  }
  if (usage.estimatedCostUsd != null) {
    parts.push(formatEstimatedCostUsd(usage.estimatedCostUsd));
  }
  return parts.join(" · ");
}

function traceStatusLabel(entry: AiJobStepTraceEntry): string {
  if (!entry.validationOk) {
    if (entry.validationErrors?.some((error) => error.includes("truncated"))) {
      return "truncated";
    }
    if (
      entry.stepId === "forms.generateBlueprint" &&
      entry.validationErrors?.some((error) => error.includes("uninspired"))
    ) {
      return "blueprint rejected";
    }
    return "validation failed";
  }
  return "ok";
}

function isBlueprintStep(entry: AiJobStepTraceEntry): boolean {
  return entry.stepId === "forms.generateBlueprint";
}

function TraceTimeline({
  trace,
  selectedIndex,
  onSelect,
}: {
  readonly trace: readonly AiJobStepTraceEntry[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
}) {
  return (
    <ol className="space-y-2">
      {trace.map((entry, index) => (
        <li key={`${entry.stepId}-${entry.attempt}-${index}`}>
          <button
            type="button"
            className={`hover:bg-muted/40 w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm ${
              selectedIndex === index
                ? "border-primary bg-primary/5"
                : "border-border"
            } ${isBlueprintStep(entry) ? "border-dashed" : ""}`}
            onClick={() => onSelect(index)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {entry.stepId}
                {isBlueprintStep(entry) ? (
                  <span className="text-primary ml-2 text-xs font-normal">
                    creative
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground text-xs">
                attempt {entry.attempt + 1}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {traceStatusLabel(entry)}
              {entry.durationMs != null ? ` · ${entry.durationMs}ms` : ""}
            </div>
            {entry.modelUsage ? (
              <div className="text-muted-foreground mt-1 truncate text-xs">
                {formatModelUsageSummary(entry.modelUsage)}
              </div>
            ) : null}
          </button>
        </li>
      ))}
    </ol>
  );
}

function TraceInspector({
  entry,
  tab,
  onTabChange,
}: {
  readonly entry: AiJobStepTraceEntry | null;
  readonly tab: InspectorTab;
  readonly onTabChange: (tab: InspectorTab) => void;
}) {
  const { t } = useTranslation("common");

  if (!entry) {
    return (
      <Text className="text-muted-foreground">
        {t("aiDebugger.selectStep")}
      </Text>
    );
  }

  const tabs: InspectorTab[] = ["prompt", "raw", "parsed", "draft"];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={tab === item ? "primary" : "outline"}
            onClick={() => onTabChange(item)}
          >
            {t(`aiDebugger.tabs.${item}`)}
          </Button>
        ))}
      </div>

      {tab === "prompt" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          {entry.modelUsage ? (
            <section>
              <Heading level={3}>{t("aiDebugger.usage.title")}</Heading>
              <Text className="text-muted-foreground text-xs">
                {formatModelUsageSummary(entry.modelUsage)}
              </Text>
            </section>
          ) : null}
          <section>
            <Heading level={3}>{t("aiDebugger.systemInstruction")}</Heading>
            <DebuggerTextBlock value={entry.systemInstruction} />
          </section>
          <section>
            <Heading level={3}>{t("aiDebugger.userText")}</Heading>
            <DebuggerTextBlock value={entry.userText} />
          </section>
          {entry.contextBlocks.map((block) => (
            <details key={block.id} className="rounded-md border p-2">
              <summary className="cursor-pointer text-sm font-medium">
                {block.id}
              </summary>
              <DebuggerTextBlock value={block.content} />
            </details>
          ))}
          <section>
            <Heading level={3}>{t("aiDebugger.outputInstruction")}</Heading>
            <DebuggerTextBlock value={entry.outputInstruction} />
          </section>
          {entry.retryHint ? (
            <section>
              <Heading level={3}>{t("aiDebugger.retryHint")}</Heading>
              <DebuggerTextBlock value={entry.retryHint} />
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "raw" ? (
        <DebuggerTextBlock
          value={entry.rawModelAnswer || t("aiDebugger.emptyRawAnswer")}
        />
      ) : null}

      {tab === "parsed" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          {entry.parsedJson != null ? (
            <DebuggerJsonBlock value={entry.parsedJson} />
          ) : (
            <Text className="text-muted-foreground">
              {t("aiDebugger.noParsedJson")}
            </Text>
          )}
          {entry.validationErrors && entry.validationErrors.length > 0 ? (
            <Alert>{entry.validationErrors.join("\n")}</Alert>
          ) : null}
        </div>
      ) : null}

      {tab === "draft" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          <section>
            <Heading level={3}>{t("aiDebugger.draftBefore")}</Heading>
            {entry.draftBeforeStep != null ? (
              <DebuggerJsonBlock value={entry.draftBeforeStep} />
            ) : (
              <Text className="text-muted-foreground">
                {t("aiDebugger.noDraftSnapshot")}
              </Text>
            )}
          </section>
          <section>
            <Heading level={3}>{t("aiDebugger.draftAfter")}</Heading>
            {entry.draftAfterStep != null ? (
              <DebuggerJsonBlock value={entry.draftAfterStep} />
            ) : (
              <Text className="text-muted-foreground">
                {t("aiDebugger.noDraftSnapshot")}
              </Text>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function JobOverviewSection({
  job,
  onOpenRelatedJob,
}: {
  readonly job: AiJobRecord;
  readonly onOpenRelatedJob: (jobId: string) => void;
}) {
  const { t } = useTranslation("common");
  const input =
    typeof job.input === "object" && job.input != null ? job.input : null;
  const entityName =
    input && "entityName" in input
      ? String((input as { entityName?: string }).entityName)
      : undefined;
  const surface =
    input && "surface" in input
      ? String((input as { surface?: string }).surface)
      : undefined;
  const outputMode =
    input && "outputMode" in input
      ? String((input as { outputMode?: string }).outputMode)
      : undefined;

  return (
    <section className="space-y-3">
      <Heading level={3}>{t("debugger.detail.metadata")}</Heading>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label={t("debugger.detail.recordId")} value={job.id} />
        <DetailField
          label={t("aiDebugger.fields.feature")}
          value={job.feature}
        />
        {job.operation ? (
          <DetailField
            label={t("aiDebugger.fields.operation")}
            value={job.operation}
          />
        ) : null}
        <DetailField
          label={t("aiDebugger.fields.createdAt")}
          value={job.createdAt}
        />
        <DetailField
          label={t("aiDebugger.fields.updatedAt")}
          value={job.updatedAt}
        />
        {job.parentJobId ? (
          <div>
            <Text className="text-muted-foreground text-xs font-medium uppercase">
              {t("aiDebugger.fields.parentJobId")}
            </Text>
            <button
              type="button"
              className="text-primary text-sm underline-offset-2 hover:underline"
              onClick={() => onOpenRelatedJob(job.parentJobId!)}
            >
              {job.parentJobId}
            </button>
          </div>
        ) : null}
        {entityName ? (
          <DetailField label={t("debugger.detail.entity")} value={entityName} />
        ) : null}
        {surface ? (
          <DetailField label={t("aiDebugger.fields.surface")} value={surface} />
        ) : null}
        {outputMode ? (
          <DetailField
            label={t("aiDebugger.fields.outputMode")}
            value={outputMode}
          />
        ) : null}
      </div>
    </section>
  );
}

function ModelUsageSection({ usage }: { readonly usage: AiJobModelUsage }) {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-3">
      <Heading level={3}>{t("aiDebugger.usage.title")}</Heading>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField
          label={t("aiDebugger.usage.model")}
          value={usage.modelId}
        />
        {usage.finishReason ? (
          <DetailField
            label={t("aiDebugger.usage.finishReason")}
            value={usage.finishReason}
          />
        ) : null}
        {usage.promptTokens != null ? (
          <DetailField
            label={t("aiDebugger.usage.promptTokens")}
            value={usage.promptTokens}
          />
        ) : null}
        {usage.candidatesTokens != null ? (
          <DetailField
            label={t("aiDebugger.usage.candidatesTokens")}
            value={usage.candidatesTokens}
          />
        ) : null}
        {usage.thoughtsTokens != null ? (
          <DetailField
            label={t("aiDebugger.usage.thoughtsTokens")}
            value={usage.thoughtsTokens}
          />
        ) : null}
        {usage.cachedContentTokens != null ? (
          <DetailField
            label={t("aiDebugger.usage.cachedContentTokens")}
            value={usage.cachedContentTokens}
          />
        ) : null}
        {usage.totalTokens != null ? (
          <DetailField
            label={t("aiDebugger.usage.totalTokens")}
            value={usage.totalTokens}
          />
        ) : null}
        {usage.outputDimensions != null ? (
          <DetailField
            label={t("aiDebugger.usage.outputDimensions")}
            value={usage.outputDimensions}
          />
        ) : null}
        {usage.inputCharacters != null ? (
          <DetailField
            label={t("aiDebugger.usage.inputCharacters")}
            value={usage.inputCharacters}
          />
        ) : null}
        {usage.imageCount != null ? (
          <DetailField
            label={t("aiDebugger.usage.imageCount")}
            value={usage.imageCount}
          />
        ) : null}
        {usage.aspectRatio ? (
          <DetailField
            label={t("aiDebugger.usage.aspectRatio")}
            value={usage.aspectRatio}
          />
        ) : null}
        {usage.costTier ? (
          <DetailField
            label={t("aiDebugger.usage.costTier")}
            value={usage.costTier}
          />
        ) : null}
        {usage.estimatedCostUsd != null ? (
          <DetailField
            label={t("aiDebugger.usage.estimatedCostUsd")}
            value={formatEstimatedCostUsd(usage.estimatedCostUsd)}
          />
        ) : null}
      </div>
      {usage.estimatedCostUsd != null ? (
        <Text className="text-muted-foreground text-xs">
          {t("aiDebugger.usage.estimateDisclaimer")}
        </Text>
      ) : null}
    </section>
  );
}

function RelatedJobsSection({
  relatedJobs,
  onOpenRelatedJob,
}: {
  readonly relatedJobs: readonly AiJobChildSummary[];
  readonly onOpenRelatedJob: (jobId: string) => void;
}) {
  const { t } = useTranslation("common");

  if (relatedJobs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <Heading level={3}>{t("aiDebugger.relatedJobs")}</Heading>
      <ul className="space-y-2">
        {relatedJobs.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              className="hover:bg-muted/40 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm"
              onClick={() => onOpenRelatedJob(child.id)}
            >
              <span className="min-w-0">
                <span className="font-medium">{child.feature}</span>
                {child.operation ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {child.operation}
                  </span>
                ) : null}
                <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                  {child.id}
                </span>
              </span>
              <DebuggerStatusBadge status={child.status} size="compact" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function JobInputSection({ job }: { readonly job: AiJobRecord }) {
  const { t } = useTranslation("common");
  const displayInput = useMemo(
    () => parseInputForDisplay(job.input),
    [job.input],
  );
  const question =
    typeof job.input === "object" &&
    job.input != null &&
    "question" in job.input &&
    typeof job.input.question === "string"
      ? job.input.question
      : null;

  return (
    <section className="space-y-3">
      {question ? (
        <div className="space-y-2">
          <Heading level={3}>{t("aiDebugger.userText")}</Heading>
          <DebuggerTextBlock value={question} />
        </div>
      ) : null}
      <div className="space-y-2">
        <Heading level={3}>{t("aiDebugger.fields.input")}</Heading>
        <DebuggerJsonBlock value={displayInput} className="max-h-[32rem]" />
      </div>
    </section>
  );
}

function JobRecordSection({ job }: { readonly job: AiJobRecord }) {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-2">
      <Heading level={3}>{t("debugger.detail.rawRecord")}</Heading>
      <DebuggerJsonBlock value={job} className="max-h-[32rem]" />
    </section>
  );
}

export function AiJobDebugDetail({ event }: { readonly event: DebugEvent }) {
  const { t } = useTranslation("common");
  const { tenantId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTraceIndex, setSelectedTraceIndex] = useState(0);
  const [tab, setTab] = useState<InspectorTab>("prompt");

  const jobQuery = useQuery({
    queryKey: ["debugger-ai-job", tenantId, event.id],
    queryFn: () => getDebugAiJob(event.id),
    enabled: Boolean(tenantId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });

  const childrenQuery = useQuery({
    queryKey: ["debugger-ai-job-children", tenantId, event.id],
    queryFn: () => getDebugAiJobChildren(event.id),
    enabled: Boolean(tenantId),
    refetchInterval: () => {
      const status = jobQuery.data?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });

  const job: AiJobRecord | undefined = jobQuery.data ?? undefined;
  const relatedChildren = childrenQuery.data?.children ?? [];
  const trace = job?.stepTrace ?? [];
  const selectedEntry = trace[selectedTraceIndex] ?? null;

  const openRelatedJob = (jobId: string) => {
    const recordKey = seedDebuggerDeepLinkEvent({
      id: jobId,
      source: "ai",
      timestamp: new Date().toISOString(),
      title: jobId,
      subtitle: "ai",
      payload: { id: jobId },
    });
    const next = new URLSearchParams(searchParams);
    next.set("record", recordKey);
    next.delete("index");
    setSearchParams(next, { replace: true });
  };

  const copyTrace = async () => {
    if (!job?.stepTrace) {
      return;
    }
    await navigator.clipboard.writeText(formatJson(job.stepTrace));
  };

  if (jobQuery.isLoading && !job) {
    return <Text className="text-muted-foreground">{t("loading")}</Text>;
  }

  if (!job) {
    return event.payload ? <DebuggerJsonBlock value={event.payload} /> : null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {trace.length > 0 ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={copyTrace}>
            {t("aiDebugger.copyTrace")}
          </Button>
        </div>
      ) : null}

      {job.error ? <Alert>{job.error}</Alert> : null}

      <JobOverviewSection job={job} onOpenRelatedJob={openRelatedJob} />
      {job.modelUsage ? <ModelUsageSection usage={job.modelUsage} /> : null}
      <RelatedJobsSection
        relatedJobs={relatedChildren}
        onOpenRelatedJob={openRelatedJob}
      />
      <JobInputSection job={job} />

      {job.progress ? (
        <section className="space-y-2">
          <Heading level={3}>{t("aiDebugger.fields.progress")}</Heading>
          <DebuggerJsonBlock value={job.progress} />
        </section>
      ) : null}

      {job.output ? (
        <section className="space-y-2">
          <Heading level={3}>{t("debugger.detail.output")}</Heading>
          <DebuggerJsonBlock value={job.output} />
        </section>
      ) : null}

      {trace.length === 0 ? (
        <div className="space-y-4">
          <Text className="text-muted-foreground">
            {job.status === "failed" && job.error
              ? t("aiDebugger.noTraceEarlyFailure")
              : t("aiDebugger.noTrace")}
          </Text>
          <JobRecordSection job={job} />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TraceTimeline
            trace={trace}
            selectedIndex={selectedTraceIndex}
            onSelect={setSelectedTraceIndex}
          />
          <TraceInspector
            entry={selectedEntry}
            tab={tab}
            onTabChange={setTab}
          />
        </div>
      )}

      {job.draft ? (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {t("aiDebugger.liveDraft")}
          </summary>
          <div className="mt-2">
            <DebuggerJsonBlock value={job.draft} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
