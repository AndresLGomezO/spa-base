import type { WorkloadRecord } from "./workload.js";

/**
 * Static catalog of every async workload in the system.
 * New Cloud Tasks queues, Scheduler jobs, Pub/Sub subscriptions,
 * worker routes, and in-process schedulers MUST be registered here
 * (see scripts/check-workload-coverage.ts).
 */
export const WORKLOAD_REGISTRY: readonly WorkloadRecord[] = [
  // ── Cloud Tasks queues ──────────────────────────────────────────────
  {
    id: "queue:ai-jobs",
    kind: "cloudTasksQueue",
    source: "system",
    domain: "ai",
    displayName: "AI Jobs Queue",
    description:
      "AI chat, UI builder, record narrative refresh, and user AI memory refresh tasks",
    actions: ["pause", "resume"],
    gcp: {
      resource: "queue",
      envKey: "CLOUD_TASKS_QUEUE_NAME",
      terraformFile: "cloudtasks-ai-jobs.tf",
    },
  },
  {
    id: "queue:hook-jobs",
    kind: "cloudTasksQueue",
    source: "system",
    domain: "platform",
    displayName: "Hook Jobs Queue",
    description:
      "Queued data-hook executions and tenant deletion tasks (per-task runs carry taskCategory)",
    actions: ["pause", "resume"],
    gcp: {
      resource: "queue",
      envKey: "HOOK_TASKS_QUEUE_NAME",
      terraformFile: "cloudtasks-hook-jobs.tf",
    },
  },
  {
    id: "queue:gmail-jobs",
    kind: "cloudTasksQueue",
    source: "system",
    domain: "email",
    displayName: "Gmail Jobs Queue",
    description:
      "Gmail window sync, process-message, and watch-renew fan-out tasks",
    actions: ["pause", "resume"],
    gcp: {
      resource: "queue",
      envKey: "GMAIL_TASKS_QUEUE_NAME",
      terraformFile: "gmail-ingest.tf",
    },
  },
  {
    id: "queue:ai-embed",
    kind: "cloudTasksQueue",
    source: "system",
    domain: "ai",
    displayName: "AI Embed Queue",
    description: "Provisioned for embedding jobs (no enqueue path wired yet)",
    actions: ["pause", "resume"],
    gcp: {
      resource: "queue",
      envKey: "AI_EMBED_TASKS_QUEUE_NAME",
      terraformFile: "cloudtasks-ai-embed.tf",
    },
  },

  // ── Cloud Scheduler jobs ────────────────────────────────────────────
  {
    id: "scheduler:schedule-tick",
    kind: "schedulerJob",
    source: "system",
    domain: "platform",
    displayName: "Schedule Tick",
    description:
      "Every-minute cron that runs due scheduled data hooks across all tenants and purges expired tenant archives",
    actions: ["pause", "resume", "runNow"],
    schedule: { cron: "* * * * *", timezone: "UTC" },
    gcp: {
      resource: "schedulerJob",
      resourceName: "schedule-tick",
      terraformFile: "gmail-ingest.tf",
    },
    route: "/tasks/schedule-tick",
  },
  {
    id: "scheduler:gmail-poll",
    kind: "schedulerJob",
    source: "integration",
    domain: "email",
    displayName: "Gmail Poll",
    description:
      "Every-5-minutes poll of connected Gmail mailboxes (active only when Gmail delivery mode is poll; no-ops when push)",
    actions: ["pause", "resume", "runNow"],
    schedule: { cron: "*/5 * * * *", timezone: "UTC" },
    gcp: {
      resource: "schedulerJob",
      resourceName: "gmail-poll",
      terraformFile: "gmail-ingest.tf",
    },
    route: "/tasks/gmail-poll",
    disableHint:
      "Inactive when delivery mode is push — switch Platform → Observability → Gmail ingest to poll, or pause this scheduler",
  },

  // ── Pub/Sub subscriptions ───────────────────────────────────────────
  {
    id: "pubsub:aggregation-events-worker",
    kind: "pubsubSubscription",
    source: "system",
    domain: "metrics",
    displayName: "Aggregation Events Worker",
    description:
      "Pull subscription that drives metric aggregation on worker-aggregation",
    actions: ["pause", "resume"],
    gcp: {
      resource: "subscription",
      resourceName: "aggregation-events-worker",
      terraformFile: "pubsub-aggregation-events.tf",
    },
  },
  {
    id: "pubsub:index-provisioning-worker",
    kind: "pubsubSubscription",
    source: "system",
    domain: "platform",
    displayName: "Index Provisioning Worker",
    description:
      "Pull subscription for Firestore index provisioning (gated by enable_index_provisioning_pubsub)",
    actions: ["pause", "resume"],
    gcp: {
      resource: "subscription",
      resourceName: "index-provisioning-worker",
      terraformFile: "pubsub-index-provisioning.tf",
    },
  },
  {
    id: "pubsub:gmail-push-api",
    kind: "pubsubSubscription",
    source: "integration",
    domain: "email",
    displayName: "Gmail Push API",
    description:
      "Push subscription from Gmail API → API /api/gmail/pubsub → Cloud Task enqueue (active only when Gmail delivery mode is push; default is poll)",
    actions: ["pause", "resume"],
    gcp: {
      resource: "subscription",
      resourceName: "gmail-push-api",
      terraformFile: "gmail-ingest.tf",
    },
    disableHint:
      "Inactive when delivery mode is poll (default) — switch Platform → Observability → Gmail ingest to push to activate",
  },

  // ── Worker HTTP routes (read-only) ──────────────────────────────────
  {
    id: "worker:process-data-hook",
    kind: "workerRoute",
    source: "system",
    domain: "platform",
    displayName: "Process Data Hook",
    description: "Handles queued data-hook executions",
    actions: [],
    route: "/tasks/process-data-hook",
    sourceFile: "apps/worker-service/src/routes/data-hook-task.route.ts",
    controlledBy: ["queue:hook-jobs"],
    disableHint: "Pause the hook-jobs queue or disable the hook definition",
  },
  {
    id: "worker:schedule-tick",
    kind: "workerRoute",
    source: "system",
    domain: "platform",
    displayName: "Schedule Tick Handler",
    description: "HTTP target for the schedule-tick Cloud Scheduler job",
    actions: [],
    route: "/tasks/schedule-tick",
    sourceFile: "apps/worker-service/src/routes/schedule-tick.route.ts",
    controlledBy: ["scheduler:schedule-tick"],
    disableHint: "Pause the schedule-tick Cloud Scheduler job",
  },
  {
    id: "worker:delete-tenant",
    kind: "workerRoute",
    source: "system",
    domain: "tenant",
    displayName: "Delete Tenant",
    description: "Long-running tenant archive/purge (awaitCompletion)",
    actions: [],
    route: "/tasks/delete-tenant",
    sourceFile: "apps/worker-service/src/routes/tenant-deletion-task.route.ts",
    controlledBy: ["queue:hook-jobs"],
    disableHint: "Pause the hook-jobs queue",
  },
  {
    id: "worker:process-ai-chat",
    kind: "workerRoute",
    source: "system",
    domain: "ai",
    displayName: "Process AI Chat",
    description: "Async AI chat job processor",
    actions: [],
    route: "/tasks/process-ai-chat",
    sourceFile: "apps/worker-service/src/routes/ai-chat-task.route.ts",
    controlledBy: ["queue:ai-jobs"],
    disableHint: "Pause the ai-jobs queue or disable AI via platform settings",
  },
  {
    id: "worker:process-ai-ui-builder",
    kind: "workerRoute",
    source: "system",
    domain: "ai",
    displayName: "Process AI UI Builder",
    description: "Async AI UI builder job processor",
    actions: [],
    route: "/tasks/process-ai-ui-builder",
    sourceFile: "apps/worker-service/src/routes/ai-ui-builder-task.route.ts",
    controlledBy: ["queue:ai-jobs"],
    disableHint: "Pause the ai-jobs queue or disable AI via platform settings",
  },
  {
    id: "worker:refresh-user-ai-memory",
    kind: "workerRoute",
    source: "system",
    domain: "ai",
    displayName: "Refresh User AI Memory",
    description: "Debounced / on-demand user AI memory refresh",
    actions: [],
    route: "/tasks/refresh-user-ai-memory",
    sourceFile:
      "apps/worker-service/src/routes/user-ai-memory-refresh-task.route.ts",
    controlledBy: ["queue:ai-jobs"],
    disableHint: "Pause the ai-jobs queue",
  },
  {
    id: "worker:nightly-user-ai-memory",
    kind: "workerRoute",
    source: "system",
    domain: "ai",
    displayName: "Nightly User AI Memory",
    description:
      "Batch user AI memory refresh (manual HTTP only — no Scheduler in TF)",
    actions: [],
    route: "/tasks/nightly-user-ai-memory",
    sourceFile:
      "apps/worker-service/src/routes/user-ai-memory-refresh-task.route.ts",
    disableHint: "Do not invoke the HTTP endpoint",
  },
  {
    id: "worker:refresh-record-narrative",
    kind: "workerRoute",
    source: "system",
    domain: "ai",
    displayName: "Refresh Record Narrative",
    description: "AI record narrative refresh from insights / hooks",
    actions: [],
    route: "/tasks/refresh-record-narrative",
    sourceFile:
      "apps/worker-service/src/routes/record-narrative-refresh-task.route.ts",
    controlledBy: ["queue:ai-jobs"],
    disableHint: "Pause the ai-jobs queue",
  },
  {
    id: "worker:gmail-poll",
    kind: "workerRoute",
    source: "integration",
    domain: "email",
    displayName: "Gmail Poll Handler",
    description: "HTTP target for the gmail-poll Cloud Scheduler job",
    actions: [],
    route: "/tasks/gmail-poll",
    sourceFile: "apps/worker-service/src/routes/gmail-ingest-task.route.ts",
    controlledBy: ["scheduler:gmail-poll"],
    disableHint:
      "Pause the gmail-poll scheduler or switch delivery mode to push",
  },
  {
    id: "worker:gmail-window-sync",
    kind: "workerRoute",
    source: "integration",
    domain: "email",
    displayName: "Gmail Window Sync",
    description: "Sync a time window of Gmail messages into the email ledger",
    actions: [],
    route: "/tasks/gmail-window-sync",
    sourceFile: "apps/worker-service/src/routes/gmail-ingest-task.route.ts",
    controlledBy: ["queue:gmail-jobs"],
    disableHint: "Pause the gmail-jobs queue",
  },
  {
    id: "worker:gmail-process-message",
    kind: "workerRoute",
    source: "integration",
    domain: "email",
    displayName: "Gmail Process Message",
    description: "Process a single Gmail message (fan-out from window sync)",
    actions: [],
    route: "/tasks/gmail-process-message",
    sourceFile: "apps/worker-service/src/routes/gmail-ingest-task.route.ts",
    controlledBy: ["queue:gmail-jobs"],
    disableHint: "Pause the gmail-jobs queue",
  },
  {
    id: "worker:gmail-watch-renew",
    kind: "workerRoute",
    source: "integration",
    domain: "email",
    displayName: "Gmail Watch Renew",
    description: "Renew Gmail push watch subscriptions",
    actions: [],
    route: "/tasks/gmail-watch-renew",
    sourceFile: "apps/worker-service/src/routes/gmail-ingest-task.route.ts",
    controlledBy: ["queue:gmail-jobs"],
    disableHint: "Pause the gmail-jobs queue",
  },

  // ── In-process schedulers (read-only) ───────────────────────────────
  {
    id: "inprocess:local-gmail-poll",
    kind: "inProcessScheduler",
    source: "integration",
    domain: "email",
    displayName: "Local Gmail Poll Scheduler",
    description:
      "5-minute setInterval substitute for Cloud Scheduler when IS_LOCAL=true",
    actions: [],
    schedule: { cron: "*/5 * * * *", timezone: "UTC" },
    sourceFile:
      "apps/worker-service/src/services/local-gmail-poll-scheduler.ts",
    controlledBy: ["scheduler:gmail-poll"],
    disableHint: "Stop the local worker process or unset Gmail ingest config",
  },
  {
    id: "inprocess:debounced-user-ai-memory",
    kind: "inProcessScheduler",
    source: "system",
    domain: "ai",
    displayName: "Debounced User AI Memory Refresh",
    description:
      "In-memory ~5-minute debouncer that fires user AI memory refresh from the worker",
    actions: [],
    sourceFile:
      "apps/worker-service/src/ai/debounced-user-ai-memory-refresh.ts",
    disableHint: "Restart the worker (clears pending) or disable AI features",
  },
  {
    id: "inprocess:index-provisioner-queue",
    kind: "inProcessScheduler",
    source: "system",
    domain: "platform",
    displayName: "Index Provisioner In-Process Queue",
    description:
      "In-memory FIFO with concurrency + batch delay for Firestore index provisioning",
    actions: [],
    sourceFile: "packages/gcp-firebase/src/firestore-index-provisioner.ts",
    disableHint:
      "configureIndexProvisioningQueue() / disable INDEX_PROVISIONING_PUBSUB",
  },
] as const satisfies readonly WorkloadRecord[];

const BY_ID = new Map(WORKLOAD_REGISTRY.map((w) => [w.id, w]));

export function getWorkloadById(id: string): WorkloadRecord | undefined {
  return BY_ID.get(id);
}

export function listWorkloads(filters?: {
  readonly kind?: readonly string[];
  readonly source?: readonly string[];
  readonly domain?: readonly string[];
  readonly q?: string;
}): readonly WorkloadRecord[] {
  let items: readonly WorkloadRecord[] = WORKLOAD_REGISTRY;
  if (filters?.kind && filters.kind.length > 0) {
    const set = new Set(filters.kind);
    items = items.filter((w) => set.has(w.kind));
  }
  if (filters?.source && filters.source.length > 0) {
    const set = new Set(filters.source);
    items = items.filter((w) => set.has(w.source));
  }
  if (filters?.domain && filters.domain.length > 0) {
    const set = new Set(filters.domain);
    items = items.filter((w) => set.has(w.domain));
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter(
      (w) =>
        w.id.toLowerCase().includes(q) ||
        w.displayName.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q),
    );
  }
  return items;
}

/** Dynamic scheduled-data-hook workloads are synthesized at runtime — this is the id prefix. */
export const SCHEDULED_HOOK_WORKLOAD_ID_PREFIX = "hook:" as const;

export function scheduledHookWorkloadId(
  tenantId: string,
  hookId: string,
): string {
  return `${SCHEDULED_HOOK_WORKLOAD_ID_PREFIX}${tenantId}:${hookId}`;
}
