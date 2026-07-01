import { Alert, Button, Heading, Text } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../../auth/AuthContext";
import {
  getDebugAiJob,
  type AiJobRecord,
  type AiJobStepTraceEntry,
  type DebugEvent,
} from "../../../lib/api-client";
import { DebuggerJsonBlock } from "../components/DebuggerJsonBlock";
import { DebuggerStatusBadge } from "../components/DebuggerStatusBadge";
import { DebuggerTextBlock } from "../components/DebuggerTextBlock";

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

function JobOverviewSection({ job }: { readonly job: AiJobRecord }) {
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
        <DetailField
          label={t("aiDebugger.fields.feature")}
          value={job.feature}
        />
        <DetailField
          label={t("aiDebugger.fields.createdAt")}
          value={job.createdAt}
        />
        <DetailField
          label={t("aiDebugger.fields.updatedAt")}
          value={job.updatedAt}
        />
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

  const job: AiJobRecord | undefined = jobQuery.data ?? undefined;
  const trace = job?.stepTrace ?? [];
  const selectedEntry = trace[selectedTraceIndex] ?? null;

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
    return (
      <div className="space-y-3">
        <Heading level={2}>{event.title}</Heading>
        <DebuggerStatusBadge status={event.status} />
        {event.payload ? <DebuggerJsonBlock value={event.payload} /> : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Heading level={2}>{job.id}</Heading>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <DebuggerStatusBadge status={job.status} />
            <Text className="text-muted-foreground text-sm">
              {job.feature} · {job.updatedAt}
            </Text>
          </div>
        </div>
        {trace.length > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={copyTrace}>
            {t("aiDebugger.copyTrace")}
          </Button>
        ) : null}
      </div>

      {job.error ? <Alert>{job.error}</Alert> : null}

      <JobOverviewSection job={job} />
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
