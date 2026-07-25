import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Heading, PageLoader, Text, Textarea } from "@repo/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/usePermission";
import { AiSpendLimitBanner } from "../../features/ai-spend/AiSpendLimitBanner";
import { useAiSpendStatus } from "../../features/ai-spend/use-ai-spend-status";
import {
  getAiJob,
  isAiSpendLimitError,
  submitAiChat,
  type AiJobRecord,
} from "../../lib/api-client";

function isTerminalStatus(status: AiJobRecord["status"]): boolean {
  return status === "completed" || status === "failed";
}

export default function AiChatRoute() {
  const { t } = useTranslation("common");
  const { isReady, tenantId } = useAuth();
  const canRun = usePermission("ai.chat.run");
  const canRead = usePermission("ai.chat.read");
  const { blocked, softWarn } = useAiSpendStatus(canRun || canRead);
  const [question, setQuestion] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: (nextQuestion: string) => submitAiChat(nextQuestion),
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
  });

  const jobQuery = useQuery({
    queryKey: ["ai-job", jobId],
    queryFn: () => {
      if (!jobId) {
        throw new Error("Missing job id");
      }
      return getAiJob(jobId);
    },
    enabled: Boolean(jobId) && canRead,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isTerminalStatus(status)) {
        return false;
      }
      return 1000;
    },
  });

  if (!isReady) {
    return <PageLoader ariaLabel={t("loading")} />;
  }

  if (!canRun) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiChat.title")}</Heading>
        <Alert>{t("aiChat.forbidden")}</Alert>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-3">
        <Heading level={1}>{t("aiChat.title")}</Heading>
        <Text>{t("tenant.selectDescription")}</Text>
      </div>
    );
  }

  const job = jobQuery.data;
  const isPending =
    submitMutation.isPending || (job != null && !isTerminalStatus(job.status));
  const controlsDisabled = isPending || blocked;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="space-y-2">
        <Heading level={1}>{t("aiChat.title")}</Heading>
        <Text>{t("aiChat.description")}</Text>
      </div>

      <AiSpendLimitBanner blocked={blocked} softWarn={softWarn} />

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = question.trim();
          if (!trimmed || controlsDisabled) {
            return;
          }
          submitMutation.mutate(trimmed);
        }}
      >
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={5}
          placeholder={t("aiChat.questionPlaceholder")}
          disabled={controlsDisabled}
        />
        <Button
          type="submit"
          disabled={controlsDisabled || question.trim().length === 0}
        >
          {isPending ? t("aiChat.submitting") : t("aiChat.submit")}
        </Button>
      </form>

      {submitMutation.isError ? (
        <Alert>
          {isAiSpendLimitError(submitMutation.error)
            ? t("aiSpend.limitReached")
            : t("aiChat.submitError")}
        </Alert>
      ) : null}

      {job ? (
        <div className="space-y-2 rounded-lg border border-border p-4">
          <Text>{t("aiChat.status", { status: job.status })}</Text>
          {job.status === "failed" && job.error ? (
            <Alert>{job.error}</Alert>
          ) : null}
          {job.status === "completed" &&
          job.output &&
          "answer" in job.output &&
          job.output.answer ? (
            <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
              {job.output.answer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
