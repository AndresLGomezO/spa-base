import {
  WORKLOAD_RUN_PARENT_HEADER,
  WORKLOAD_RUN_ROOT_HEADER,
} from "@repo/workload-runs";

export interface WorkloadRunLineage {
  parentRunId?: string;
  rootRunId?: string;
}

export function readWorkloadRunLineageFromHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): WorkloadRunLineage {
  if (!headers) return {};

  const get = (name: string): string | undefined => {
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lower) {
        return Array.isArray(value) ? value[0] : (value ?? undefined);
      }
    }
    return undefined;
  };

  const parentRunId = get(WORKLOAD_RUN_PARENT_HEADER);
  const rootRunId = get(WORKLOAD_RUN_ROOT_HEADER);

  return {
    ...(parentRunId ? { parentRunId } : {}),
    ...(rootRunId ? { rootRunId } : {}),
  };
}
