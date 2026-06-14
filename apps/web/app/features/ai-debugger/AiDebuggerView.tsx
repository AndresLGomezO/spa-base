import { Alert, Button, Heading, PageLoader, Text } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import {
  getAiJob,
  listAiJobs,
  type AiJobRecord,
  type AiJobStepTraceEntry,
} from "../../lib/api-client";

type InspectorTab = "prompt" | "raw" | "parsed" | "draft";

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
            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
              selectedIndex === index
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            } ${isBlueprintStep(entry) ? "border-dashed" : ""}`}
            onClick={() => onSelect(index)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {entry.stepId}
                {isBlueprintStep(entry) ? (
                  <span className="ml-2 text-xs font-normal text-primary">
                    creative
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">
                attempt {entry.attempt + 1}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
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
            <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {entry.systemInstruction}
            </pre>
          </section>
          <section>
            <Heading level={3}>{t("aiDebugger.userText")}</Heading>
            <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {entry.userText}
            </pre>
          </section>
          {entry.contextBlocks.map((block) => (
            <details key={block.id} className="rounded-md border p-2">
              <summary className="cursor-pointer text-sm font-medium">
                {block.id}
              </summary>
              <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap">
                {block.content}
              </pre>
            </details>
          ))}
          <section>
            <Heading level={3}>{t("aiDebugger.outputInstruction")}</Heading>
            <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {entry.outputInstruction}
            </pre>
          </section>
          {entry.retryHint ? (
            <section>
              <Heading level={3}>{t("aiDebugger.retryHint")}</Heading>
              <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                {entry.retryHint}
              </pre>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "raw" ? (
        <pre className="min-h-0 flex-1 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
          {entry.rawModelAnswer || t("aiDebugger.emptyRawAnswer")}
        </pre>
      ) : null}

      {tab === "parsed" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          <pre className="overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {entry.parsedJson != null
              ? formatJson(entry.parsedJson)
              : t("aiDebugger.noParsedJson")}
          </pre>
          {entry.validationErrors && entry.validationErrors.length > 0 ? (
            <Alert>{entry.validationErrors.join("\n")}</Alert>
          ) : null}
        </div>
      ) : null}

      {tab === "draft" ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          <section>
            <Heading level={3}>{t("aiDebugger.draftBefore")}</Heading>
            <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {entry.draftBeforeStep != null
                ? formatJson(entry.draftBeforeStep)
                : t("aiDebugger.noDraftSnapshot")}
            </pre>
          </section>
          <section>
            <Heading level={3}>{t("aiDebugger.draftAfter")}</Heading>
            <pre className="mt-2 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {entry.draftAfterStep != null
                ? formatJson(entry.draftAfterStep)
                : t("aiDebugger.noDraftSnapshot")}
            </pre>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function JobDetailPanel({ job }: { readonly job: AiJobRecord | undefined }) {
  const { t } = useTranslation("common");
  const [selectedTraceIndex, setSelectedTraceIndex] = useState(0);
  const [tab, setTab] = useState<InspectorTab>("prompt");

  const trace = job?.stepTrace ?? [];
  const selectedEntry = trace[selectedTraceIndex] ?? null;

  const copyTrace = async () => {
    if (!job?.stepTrace) {
      return;
    }
    await navigator.clipboard.writeText(formatJson(job.stepTrace));
  };

  if (!job) {
    return (
      <Text className="text-muted-foreground">{t("aiDebugger.selectJob")}</Text>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Heading level={2}>{job.id}</Heading>
          <Text className="text-muted-foreground">
            {job.status} · {job.feature} · {job.updatedAt}
          </Text>
        </div>
        {trace.length > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={copyTrace}>
            {t("aiDebugger.copyTrace")}
          </Button>
        ) : null}
      </div>

      {job.error ? <Alert>{job.error}</Alert> : null}

      {trace.length === 0 ? (
        <Text className="text-muted-foreground">{t("aiDebugger.noTrace")}</Text>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TraceTimeline
            trace={trace}
            selectedIndex={selectedTraceIndex}
            onSelect={(index) => {
              setSelectedTraceIndex(index);
            }}
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
          <pre className="mt-2 overflow-auto text-xs whitespace-pre-wrap">
            {formatJson(job.draft)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export function AiDebuggerView() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canRead = usePermission("ai.uiBuilder.read");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["ai-debugger-jobs", tenantId],
    queryFn: () => listAiJobs({ feature: "uiBuilder", limit: 20 }),
    enabled: isReady && Boolean(tenantId) && canRead,
  });

  const jobQuery = useQuery({
    queryKey: ["ai-debugger-job", tenantId, selectedJobId],
    queryFn: () => getAiJob(selectedJobId!),
    enabled: isReady && Boolean(tenantId) && canRead && Boolean(selectedJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });

  const jobs = useMemo(
    () => jobsQuery.data?.jobs ?? [],
    [jobsQuery.data?.jobs],
  );

  const selectedJob = useMemo((): AiJobRecord | undefined => {
    if (jobQuery.data) {
      return jobQuery.data;
    }
    const summary = jobs.find((job) => job.id === selectedJobId);
    if (!summary) {
      return undefined;
    }
    return {
      ...summary,
      output: null,
      draft: null,
    };
  }, [jobQuery.data, jobs, selectedJobId]);

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRead) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiDebugger.title")}</Heading>
        <Alert>{t("aiDebugger.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiDebugger.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Heading level={1}>{t("aiDebugger.title")}</Heading>
        <Text>{t("aiDebugger.description")}</Text>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-2 overflow-auto rounded-md border p-3">
          <Heading level={3}>{t("aiDebugger.recentJobs")}</Heading>
          {jobsQuery.isLoading ? (
            <Text>{t("loading")}</Text>
          ) : jobs.length === 0 ? (
            <Text className="text-muted-foreground">
              {t("aiDebugger.noJobs")}
            </Text>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      selectedJobId === job.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <div className="font-medium">{job.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.status}
                      {"question" in job.input && job.input.question
                        ? ` · ${String(job.input.question).slice(0, 40)}`
                        : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-h-0 overflow-auto rounded-md border p-4">
          <JobDetailPanel job={selectedJob} />
        </section>
      </div>
    </div>
  );
}
