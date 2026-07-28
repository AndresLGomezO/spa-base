import { describe, expect, it } from "vitest";
import { buildGcpConsoleUrl } from "./gcp-console-url.js";

describe("buildGcpConsoleUrl", () => {
  it("builds a Cloud Tasks queue console URL", () => {
    expect(
      buildGcpConsoleUrl({
        resource: "queue",
        projectId: "demo-project-base",
        region: "us-central1",
        resourceName: "ai-jobs",
      }),
    ).toBe(
      "https://console.cloud.google.com/cloudtasks/queue/us-central1/ai-jobs/tasks?project=demo-project-base",
    );
  });

  it("builds a Cloud Scheduler job console URL", () => {
    expect(
      buildGcpConsoleUrl({
        resource: "schedulerJob",
        projectId: "demo-project-base",
        region: "us-central1",
        resourceName: "es-schedule-tick-demo",
      }),
    ).toBe(
      "https://console.cloud.google.com/cloudscheduler/jobs/edit/us-central1/es-schedule-tick-demo?project=demo-project-base",
    );
  });

  it("builds a Pub/Sub subscription console URL", () => {
    expect(
      buildGcpConsoleUrl({
        resource: "subscription",
        projectId: "demo-project-base",
        resourceName: "aggregation-events-worker",
      }),
    ).toBe(
      "https://console.cloud.google.com/cloudpubsub/subscription/detail/aggregation-events-worker?project=demo-project-base",
    );
  });

  it("returns null when region is required but missing", () => {
    expect(
      buildGcpConsoleUrl({
        resource: "queue",
        projectId: "demo-project-base",
        resourceName: "ai-jobs",
      }),
    ).toBeNull();
  });
});
