import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAiChatSession,
  getAiJob,
  hideAiChatSession,
  isAiSpendLimitError,
  listAiChatSessions,
  submitAiChat,
  type AiChatSessionDetail,
  type AiChatSessionMessage,
  type AiChatSessionSummary,
  type AiJobRecord,
} from "../../lib/api-client";
import { useAiSpendActionGuard } from "../ai-spend/use-ai-spend-action-guard";

const SESSIONS_QUERY_KEY = ["ai-chat-sessions"] as const;
const RUNNING_POLL_MS = 300;

function isTerminalStatus(status: AiJobRecord["status"]): boolean {
  return status === "completed" || status === "failed";
}

function sessionQueryKey(sessionId: string) {
  return ["ai-chat-session", sessionId] as const;
}

function readPartialAnswer(job: AiJobRecord | undefined): string | null {
  const draft = job?.draft;
  if (!draft || typeof draft !== "object") return null;
  const partial = (draft as { partialAnswer?: unknown }).partialAnswer;
  return typeof partial === "string" && partial.trim().length > 0
    ? partial
    : null;
}

function readIsStreaming(job: AiJobRecord | undefined): boolean {
  const draft = job?.draft;
  if (!draft || typeof draft !== "object") return false;
  return (draft as { streaming?: unknown }).streaming === true;
}

export function useAiChatSession(options: {
  readonly enabled: boolean;
  readonly canRun: boolean;
  readonly canRead: boolean;
}) {
  const { enabled, canRun, canRead } = options;
  const queryClient = useQueryClient();
  const { beforeAiAction, handleAiActionError } = useAiSpendActionGuard(
    enabled && (canRun || canRead),
  );

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(
    null,
  );
  const [view, setView] = useState<"sessions" | "thread">("sessions");

  const sessionsQuery = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: listAiChatSessions,
    enabled: enabled && canRead,
  });

  const sessionQuery = useQuery({
    queryKey: activeSessionId
      ? sessionQueryKey(activeSessionId)
      : ["ai-chat-session", "none"],
    queryFn: () => {
      if (!activeSessionId) {
        throw new Error("Missing session id");
      }
      return getAiChatSession(activeSessionId);
    },
    enabled: Boolean(activeSessionId) && canRead,
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
      return RUNNING_POLL_MS;
    },
  });

  const job = jobQuery.data;
  const isPending =
    Boolean(jobId) && (job == null || !isTerminalStatus(job.status));
  const partialAnswer = readPartialAnswer(job);
  const isStreaming =
    isPending && (readIsStreaming(job) || Boolean(partialAnswer));
  const progressLabel =
    isPending && job?.progress?.stepLabel ? job.progress.stepLabel : null;

  useEffect(() => {
    if (!job || !isTerminalStatus(job.status) || !activeSessionId) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: sessionQueryKey(activeSessionId),
    });
    void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    if (job.status === "completed") {
      setPendingUserMessage(null);
    }
  }, [activeSessionId, job, queryClient]);

  const submitMutation = useMutation({
    mutationFn: async (question: string) => {
      return submitAiChat(question, activeSessionId ?? undefined);
    },
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      setJobId(data.jobId);
      setView("thread");
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
    onError: (error) => {
      setPendingUserMessage(null);
      handleAiActionError(error);
    },
  });

  const hideMutation = useMutation({
    mutationFn: hideAiChatSession,
    onSuccess: (_data, sessionId) => {
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setJobId(null);
        setPendingUserMessage(null);
        setView("sessions");
      }
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      void queryClient.removeQueries({ queryKey: sessionQueryKey(sessionId) });
    },
  });

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setJobId(null);
    setPendingUserMessage(null);
    setView("thread");
  }, []);

  const openSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setJobId(null);
    setPendingUserMessage(null);
    setView("thread");
  }, []);

  const showSessions = useCallback(() => {
    setView("sessions");
  }, []);

  const ask = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isPending || submitMutation.isPending || !canRun) {
        return false;
      }
      if (!beforeAiAction()) {
        return false;
      }
      setPendingUserMessage(trimmed);
      submitMutation.mutate(trimmed);
      return true;
    },
    [beforeAiAction, canRun, isPending, submitMutation],
  );

  const messages: readonly AiChatSessionMessage[] = useMemo(() => {
    const base = sessionQuery.data?.messages ?? [];
    if (!pendingUserMessage) {
      return base;
    }
    const alreadyPresent = base.some(
      (message) =>
        message.role === "user" && message.content === pendingUserMessage,
    );
    if (alreadyPresent) {
      return base;
    }
    return [
      ...base,
      {
        role: "user" as const,
        content: pendingUserMessage,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [pendingUserMessage, sessionQuery.data?.messages]);

  const jobError =
    job?.status === "failed" ? (job.error ?? "AI job failed") : null;

  const rawSubmitError = submitMutation.isError ? submitMutation.error : null;
  const submitError =
    rawSubmitError && !isAiSpendLimitError(rawSubmitError)
      ? rawSubmitError
      : null;

  return {
    view,
    sessions: (sessionsQuery.data?.sessions ??
      []) as readonly AiChatSessionSummary[],
    sessionsLoading: sessionsQuery.isLoading,
    sessionsError: sessionsQuery.isError,
    session: sessionQuery.data as AiChatSessionDetail | undefined,
    activeSessionId,
    messages,
    job,
    jobError,
    isPending: isPending || submitMutation.isPending,
    isStreaming,
    partialAnswer,
    progressLabel,
    submitError,
    ask,
    startNewChat,
    openSession,
    showSessions,
    hideSession: (sessionId: string) => hideMutation.mutate(sessionId),
    isHiding: hideMutation.isPending,
    refreshSessions: () =>
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  };
}

export type UseAiChatSessionResult = ReturnType<typeof useAiChatSession>;
