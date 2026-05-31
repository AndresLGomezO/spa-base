import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listShares,
  shareEntity,
  unshareEntity,
  type ShareEntry,
} from "../lib/api-client";

function shareQueryKey(entityName: string, recordId: string) {
  return ["shares", entityName, recordId] as const;
}

export function useShare(entityName: string, recordId: string | null) {
  const queryClient = useQueryClient();

  const shares = useQuery<readonly ShareEntry[]>({
    queryKey: shareQueryKey(entityName, recordId ?? ""),
    queryFn: () => listShares(entityName, recordId!),
    enabled: recordId !== null,
  });

  const grantMutation = useMutation({
    mutationFn: ({
      userId,
      permission,
    }: {
      userId: string;
      permission: "read" | "write";
    }) => shareEntity(entityName, recordId!, userId, permission),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shareQueryKey(entityName, recordId ?? ""),
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      unshareEntity(entityName, recordId!, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shareQueryKey(entityName, recordId ?? ""),
      });
    },
  });

  return {
    shares: shares.data ?? [],
    isLoading: shares.isLoading,
    error: shares.error,
    grant: grantMutation.mutateAsync,
    revoke: revokeMutation.mutateAsync,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
}
