import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { WORKLOAD_REGISTRY } from "./workload-registry.js";

const TF_DIR = path.resolve(
  import.meta.dirname,
  "../../../packages/infrastructure/terraform",
);

function readTfFiles(): string[] {
  return fs
    .readdirSync(TF_DIR)
    .filter((f) => f.endsWith(".tf"))
    .map((f) => fs.readFileSync(path.join(TF_DIR, f), "utf-8"));
}

function extractTfResources(type: string): { name: string; content: string }[] {
  const re = new RegExp(`resource\\s+"${type}"\\s+"(\\w+)"\\s*\\{`, "g");
  const results: { name: string; content: string }[] = [];
  for (const src of readTfFiles()) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      results.push({ name: m[1]!, content: src });
    }
  }
  return results;
}

const registryIds = new Set(WORKLOAD_REGISTRY.map((w) => w.id));

describe("terraform-parity", () => {
  it("every Cloud Tasks queue has a registry entry", () => {
    const expected: Record<string, string> = {
      ai_jobs: "queue:ai-jobs",
      hook_jobs: "queue:hook-jobs",
      gmail_jobs: "queue:gmail-jobs",
      ai_embed: "queue:ai-embed",
    };

    const queues = extractTfResources("google_cloud_tasks_queue");
    for (const q of queues) {
      const expectedId = expected[q.name];
      if (!expectedId) continue;
      expect(
        registryIds.has(expectedId),
        `queue ${q.name} → registry id "${expectedId}" missing`,
      ).toBe(true);
    }

    for (const [tf, id] of Object.entries(expected)) {
      expect(
        registryIds.has(id),
        `expected registry id "${id}" for tf resource "${tf}"`,
      ).toBe(true);
    }
  });

  it("every Cloud Scheduler job has a registry entry", () => {
    const expected: Record<string, string> = {
      schedule_tick: "scheduler:schedule-tick",
      gmail_poll: "scheduler:gmail-poll",
    };

    const jobs = extractTfResources("google_cloud_scheduler_job");
    for (const j of jobs) {
      const expectedId = expected[j.name];
      if (!expectedId) continue;
      expect(
        registryIds.has(expectedId),
        `scheduler job ${j.name} → registry id "${expectedId}" missing`,
      ).toBe(true);
    }

    for (const [tf, id] of Object.entries(expected)) {
      expect(
        registryIds.has(id),
        `expected registry id "${id}" for tf resource "${tf}"`,
      ).toBe(true);
    }
  });

  it("every Pub/Sub subscription has a registry entry", () => {
    const expected: Record<string, string> = {
      aggregation_events_worker: "pubsub:aggregation-events-worker",
      gmail_push_api: "pubsub:gmail-push-api",
    };

    const subs = extractTfResources("google_pubsub_subscription");
    for (const s of subs) {
      const expectedId = expected[s.name];
      if (!expectedId) continue;
      expect(
        registryIds.has(expectedId),
        `subscription ${s.name} → registry id "${expectedId}" missing`,
      ).toBe(true);
    }

    for (const [tf, id] of Object.entries(expected)) {
      expect(
        registryIds.has(id),
        `expected registry id "${id}" for tf resource "${tf}"`,
      ).toBe(true);
    }
  });

  it("registry references existing terraform files", () => {
    const tfFileNames = new Set(
      fs.readdirSync(TF_DIR).filter((f) => f.endsWith(".tf")),
    );

    for (const w of WORKLOAD_REGISTRY) {
      if (!w.gcp?.terraformFile) continue;
      expect(
        tfFileNames.has(w.gcp.terraformFile),
        `registry ${w.id} references ${w.gcp.terraformFile} which does not exist in terraform/`,
      ).toBe(true);
    }
  });
});
