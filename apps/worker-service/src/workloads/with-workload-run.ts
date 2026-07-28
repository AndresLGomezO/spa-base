import type {
  BeginWorkloadRunInput,
  WorkloadRunHandle,
  WorkloadRunRecorder,
} from "@repo/workload-runs";

export interface WorkloadRunLogger {
  child?: (bindings: Record<string, unknown>) => WorkloadRunLogger;
  info: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
  error: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
}

export async function withWorkloadRun<T>(
  recorder: WorkloadRunRecorder,
  beginInput: BeginWorkloadRunInput,
  logger: WorkloadRunLogger,
  fn: (handle: WorkloadRunHandle, runLogger: WorkloadRunLogger) => Promise<T>,
): Promise<T> {
  const handle = await recorder.beginRun(beginInput);

  const childLogger = logger.child
    ? logger.child({
        workloadRunId: handle.id,
        workloadId: beginInput.workloadId,
        rootRunId: handle.rootRunId,
      })
    : logger;

  try {
    const result = await fn(handle, childLogger);
    await handle.succeed();
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await handle.fail({ message, ...(stack ? { stack } : {}) });
    throw error;
  }
}
