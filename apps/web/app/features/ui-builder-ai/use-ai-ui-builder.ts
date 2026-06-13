import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAiJob,
  listUiBuilderAiSuggestions,
  submitAiUiBuilder,
  type AiJobRecord,
  type SubmitAiUiBuilderInput,
  type UiBuilderSuggestionRecord,
} from "../../lib/api-client";
import type { UiBuilderLastRun } from "./ui-builder-ai-job-storage";

const RATE_LIMIT_ERROR_PATTERNS = [
  /429/i,
  /resource_exhausted/i,
  /too many requests/i,
  /resource exhausted/i,
  /rate limit exceeded/i,
];

interface LastUiBuilderRunDisplay {
  readonly suggestion: UiBuilderSuggestionRecord | null;
  readonly jobError: string | null;
  readonly finishedAt: string;
  readonly status: UiBuilderLastRun["status"];
}

function isTerminalStatus(status: AiJobRecord["status"]): boolean {
  return status === "completed" || status === "failed";
}

export function useAiUiBuilderJob(jobId: string | null) {
  const jobQuery = useQuery({
    queryKey: ["ai-ui-builder-job", jobId],
    queryFn: () => {
      if (!jobId) {
        throw new Error("Missing job id");
      }
      return getAiJob(jobId);
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isTerminalStatus(status)) {
        return false;
      }
      return 1000;
    },
  });

  const isWorking =
    Boolean(jobId) &&
    (jobQuery.isLoading ||
      (jobQuery.data != null && !isTerminalStatus(jobQuery.data.status)));

  return {
    job: jobQuery.data,
    isWorking,
    isError: jobQuery.isError,
    error: jobQuery.error,
  };
}

export function useSubmitAiUiBuilderJob() {
  return useMutation({
    mutationFn: (input: SubmitAiUiBuilderInput) => submitAiUiBuilder(input),
  });
}

function uiBuilderSuggestionsQueryKey(
  entityName: string,
  surface = "list",
): readonly [string, string, string] {
  return ["ui-builder-ai-suggestions", entityName, surface];
}

export function useUiBuilderAiSuggestions(
  entityName: string,
  surface = "list",
  enabled = true,
) {
  return useQuery({
    queryKey: uiBuilderSuggestionsQueryKey(entityName, surface),
    queryFn: async () => {
      const result = await listUiBuilderAiSuggestions(entityName, surface);
      return result.suggestions;
    },
    enabled,
  });
}

export function useInvalidateUiBuilderAiSuggestions() {
  const queryClient = useQueryClient();
  return (entityName: string, surface = "list") =>
    queryClient.invalidateQueries({
      queryKey: uiBuilderSuggestionsQueryKey(entityName, surface),
    });
}

export function findSuggestionByJobId(
  suggestions: readonly UiBuilderSuggestionRecord[],
  jobId: string,
): UiBuilderSuggestionRecord | undefined {
  return suggestions.find((suggestion) => suggestion.jobId === jobId);
}

export function formatAiJobError(
  message: string,
  translate: (key: string) => string,
): string {
  if (RATE_LIMIT_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return translate("itemListDesigner.ai.rateLimitError");
  }
  return message;
}

export function resolveLastUiBuilderRunDisplay(
  lastRun: UiBuilderLastRun | null,
  suggestions: readonly UiBuilderSuggestionRecord[],
): LastUiBuilderRunDisplay | null {
  if (!lastRun) {
    return null;
  }

  const suggestion = findSuggestionByJobId(suggestions, lastRun.jobId) ?? null;

  if (lastRun.status === "failed") {
    if (suggestion?.status === "failed") {
      return {
        suggestion,
        jobError: null,
        finishedAt: lastRun.finishedAt,
        status: lastRun.status,
      };
    }

    return {
      suggestion: null,
      jobError: lastRun.error ?? null,
      finishedAt: lastRun.finishedAt,
      status: lastRun.status,
    };
  }

  return {
    suggestion,
    jobError: null,
    finishedAt: lastRun.finishedAt,
    status: lastRun.status,
  };
}
