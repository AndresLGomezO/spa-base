/**
 * Asserts that every Cloud Tasks queue, Cloud Scheduler job, and Pub/Sub
 * subscription defined in Terraform has a matching entry in the workload
 * registry, and that key worker routes are instrumented with workload run
 * recording.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-workload-coverage.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TF_DIR = path.join(ROOT, "packages/infrastructure/terraform");
const REGISTRY_FILE = path.join(
  ROOT,
  "packages/workload-registry/src/workload-registry.ts",
);
const WORKER_SERVICE_DIR = path.join(ROOT, "apps/worker-service/src");

const IGNORE_COMMENT = /workload-registry:ignore/;

// ── 1. Parse registry ids from workload-registry.ts ────────────────────

function parseRegistryIds(): Set<string> {
  const src = fs.readFileSync(REGISTRY_FILE, "utf-8");
  const ids = new Set<string>();
  const re = /id:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    ids.add(m[1]!);
  }
  return ids;
}

// ── 2. Scan Terraform for queue / scheduler / subscription resources ───

interface TfResource {
  type: string;
  name: string;
  file: string;
  ignored: boolean;
}

function scanTerraform(): TfResource[] {
  const resources: TfResource[] = [];
  const tfFiles = fs
    .readdirSync(TF_DIR)
    .filter((f) => f.endsWith(".tf"))
    .map((f) => path.join(TF_DIR, f));

  const resourceRe =
    /resource\s+"(google_cloud_tasks_queue|google_cloud_scheduler_job|google_pubsub_subscription|google_pubsub_topic)"\s+"(\w+)"/g;

  for (const file of tfFiles) {
    const src = fs.readFileSync(file, "utf-8");
    let m: RegExpExecArray | null;
    while ((m = resourceRe.exec(src)) !== null) {
      const lineStart = src.lastIndexOf("\n", m.index) + 1;
      const lineEnd = src.indexOf("\n", m.index);
      const contextBlock = src.slice(
        Math.max(0, lineStart - 200),
        lineEnd + 200,
      );
      resources.push({
        type: m[1]!,
        name: m[2]!,
        file: path.basename(file),
        ignored: IGNORE_COMMENT.test(contextBlock),
      });
    }
  }

  return resources;
}

// ── 3. Known resource → registry id mapping ────────────────────────────

const QUEUE_MAP: Record<string, string> = {
  ai_jobs: "queue:ai-jobs",
  hook_jobs: "queue:hook-jobs",
  gmail_jobs: "queue:gmail-jobs",
  ai_embed: "queue:ai-embed",
};

const SCHEDULER_MAP: Record<string, string> = {
  schedule_tick: "scheduler:schedule-tick",
  gmail_poll: "scheduler:gmail-poll",
};

const SUBSCRIPTION_MAP: Record<string, string> = {
  aggregation_events_worker: "pubsub:aggregation-events-worker",
  gmail_push_api: "pubsub:gmail-push-api",
};

function expectedRegistryId(tf: TfResource): string | null {
  if (tf.type === "google_cloud_tasks_queue") return QUEUE_MAP[tf.name] ?? null;
  if (tf.type === "google_cloud_scheduler_job")
    return SCHEDULER_MAP[tf.name] ?? null;
  if (tf.type === "google_pubsub_subscription")
    return SUBSCRIPTION_MAP[tf.name] ?? null;
  return null;
}

// ── 4. Check instrumentation (soft) ────────────────────────────────────

function checkInstrumentation(): string[] {
  const warnings: string[] = [];
  const instrumentationRe = /beginRun|withWorkloadRun|createWorkloadRunRecorder/;

  // Entry-point routes that must be instrumented (processor files may stay clean).
  const routeFiles = [
    "routes/schedule-tick.route.ts",
    "routes/data-hook-task.route.ts",
    "routes/tenant-deletion-task.route.ts",
    "routes/gmail-ingest-task.route.ts",
    "routes/ai-chat-task.route.ts",
    "services/local-gmail-poll-scheduler.ts",
    "ai/debounced-user-ai-memory-refresh.ts",
  ];

  for (const rel of routeFiles) {
    const filePath = path.join(WORKER_SERVICE_DIR, rel);
    if (!fs.existsSync(filePath)) {
      warnings.push(`[warn] expected instrumentation file missing: ${rel}`);
      continue;
    }
    const src = fs.readFileSync(filePath, "utf-8");
    if (!instrumentationRe.test(src)) {
      warnings.push(
        `[warn] ${rel} does not reference workload run recording (beginRun / withWorkloadRun)`,
      );
    }
  }

  return warnings;
}

// ── 5. Run checks ──────────────────────────────────────────────────────

function main(): void {
  const registryIds = parseRegistryIds();
  const tfResources = scanTerraform();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const tf of tfResources) {
    if (tf.ignored) continue;
    // Skip topics — only subscriptions map to registry entries
    if (tf.type === "google_pubsub_topic") continue;

    const expected = expectedRegistryId(tf);
    if (expected === null) {
      warnings.push(
        `[warn] Terraform resource ${tf.type}.${tf.name} (${tf.file}) has no known registry mapping — add it to QUEUE_MAP/SCHEDULER_MAP/SUBSCRIPTION_MAP in this script`,
      );
      continue;
    }
    if (!registryIds.has(expected)) {
      errors.push(
        `[error] Terraform ${tf.type}.${tf.name} (${tf.file}) expects registry id "${expected}" but it is missing from WORKLOAD_REGISTRY`,
      );
    }
  }

  warnings.push(...checkInstrumentation());

  if (warnings.length > 0) {
    console.warn("\n⚠  Workload coverage warnings:");
    for (const w of warnings) console.warn(`  ${w}`);
  }

  if (errors.length > 0) {
    console.error("\n✗  Workload coverage errors:");
    for (const e of errors) console.error(`  ${e}`);
    console.error(
      `\n${errors.length} error(s). Register missing workloads in packages/workload-registry/src/workload-registry.ts`,
    );
    process.exit(1);
  }

  console.log(
    `\n✓  Workload coverage OK — ${registryIds.size} registry entries, ${tfResources.length} Terraform resources checked.`,
  );
}

main();
