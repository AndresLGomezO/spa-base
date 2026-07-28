# Agent guidelines

## Async workloads (Workload Manager)

Every Cloud Tasks queue, Cloud Scheduler job, Pub/Sub subscription, worker `/tasks/*` route, and in-process scheduler MUST be:

1. Registered in `packages/workload-registry/src/workload-registry.ts`
2. Instrumented with `createWorkloadRunRecorder` / `withWorkloadRun` (`@repo/workload-runs`) at the async entry point

Propagate lineage via `X-Workload-Run-Parent-Id` / `X-Workload-Run-Root-Id` when enqueueing Cloud Tasks.

Run `pnpm check:workload-coverage` (or `pnpm exec tsx scripts/check-workload-coverage.ts`) before merging changes that add background work.

Opt out only with an explicit `// workload-registry:ignore reason=...` comment next to the trigger.
