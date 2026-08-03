import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@repo/ui";

import {
  applyStatementExtraction,
  getStatementExtraction,
  rejectStatementExtraction,
  rerunStatementExtraction,
} from "./api";
import { statementExtractionsQueryKey } from "./useStatementExtractions";

function statementExtractionQueryKey(id: string) {
  return ["statement-extraction", id] as const;
}

export function useStatementExtraction(options: {
  readonly id: string | null;
  readonly enabled?: boolean;
}) {
  const { id, enabled = true } = options;

  return useQuery({
    queryKey: statementExtractionQueryKey(id ?? ""),
    queryFn: () => getStatementExtraction(id!),
    enabled: enabled && Boolean(id),
    staleTime: 15_000,
  });
}

export function useStatementExtractionActions(options: {
  readonly id: string | null;
  readonly onSettledSuccess?: () => void;
}) {
  const { id, onSettledSuccess } = options;
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();

  async function invalidate() {
    if (id) {
      await queryClient.invalidateQueries({
        queryKey: statementExtractionQueryKey(id),
      });
    }
    await queryClient.invalidateQueries({
      queryKey: statementExtractionsQueryKey("awaitingReview"),
    });
  }

  const applyMutation = useMutation({
    mutationFn: (edits?: Record<string, unknown>) => {
      if (!id) {
        throw new Error("Missing extraction id");
      }
      return applyStatementExtraction(
        id,
        edits && Object.keys(edits).length > 0 ? { edits } : undefined,
      );
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t("statementExtractions.applySuccess"));
      onSettledSuccess?.();
    },
    onError: () => {
      toast.error(t("statementExtractions.applyFailed"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!id) {
        throw new Error("Missing extraction id");
      }
      return rejectStatementExtraction(id);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t("statementExtractions.rejectSuccess"));
      onSettledSuccess?.();
    },
    onError: () => {
      toast.error(t("statementExtractions.rejectFailed"));
    },
  });

  const rerunMutation = useMutation({
    mutationFn: (templateId?: string) => {
      if (!id) {
        throw new Error("Missing extraction id");
      }
      return rerunStatementExtraction(
        id,
        templateId ? { templateId } : undefined,
      );
    },
    onSuccess: async () => {
      await invalidate();
      toast.success(t("statementExtractions.rerunSuccess"));
    },
    onError: () => {
      toast.error(t("statementExtractions.rerunFailed"));
    },
  });

  return {
    apply: applyMutation.mutate,
    reject: rejectMutation.mutate,
    rerun: rerunMutation.mutate,
    applying: applyMutation.isPending,
    rejecting: rejectMutation.isPending,
    rerunning: rerunMutation.isPending,
    isMutating:
      applyMutation.isPending ||
      rejectMutation.isPending ||
      rerunMutation.isPending,
  };
}
