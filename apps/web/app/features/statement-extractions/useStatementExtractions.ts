import { useQuery } from "@tanstack/react-query";

import {
  listStatementExtractions,
  type StatementExtractionStatus,
} from "./api";

export function statementExtractionsQueryKey(
  status: StatementExtractionStatus | string = "awaitingReview",
) {
  return ["statement-extractions", status] as const;
}

export function useStatementExtractions(
  options: {
    readonly status?: StatementExtractionStatus | string;
    readonly enabled?: boolean;
  } = {},
) {
  const { status = "awaitingReview", enabled = true } = options;

  return useQuery({
    queryKey: statementExtractionsQueryKey(status),
    queryFn: () => listStatementExtractions({ status }),
    enabled,
    staleTime: 30_000,
  });
}
