import { describe, expect, it } from "vitest";
import { buildCloudLoggingUrl } from "./cloud-logging-url.js";

describe("buildCloudLoggingUrl", () => {
  it("joins Logs Explorer params with semicolons, not ampersands", () => {
    const url = buildCloudLoggingUrl({
      projectId: "demo-project-base",
      workloadRunId: "run-ms3zh4w0-sxhg9vgo",
      since: "2026-07-28T01:35:00.096Z",
      until: "2026-07-28T02:35:00.096Z",
    });

    expect(url).toBe(
      "https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0AjsonPayload.workloadRunId%3D%22run-ms3zh4w0-sxhg9vgo%22;startTime=2026-07-28T01%3A35%3A00.096Z;endTime=2026-07-28T02%3A35%3A00.096Z?project=demo-project-base",
    );
    expect(url).not.toContain("&startTime=");
    expect(url).not.toContain("&endTime=");

    const path = new URL(url).pathname;
    const encodedQuery = path.split(";").find((p) => p.startsWith("query="));
    expect(encodedQuery).toBeDefined();
    const filter = decodeURIComponent(encodedQuery!.slice("query=".length));
    expect(filter).toBe(
      'resource.type="cloud_run_revision"\njsonPayload.workloadRunId="run-ms3zh4w0-sxhg9vgo"',
    );
    expect(filter).not.toContain("startTime");
  });

  it("omits time range params when not provided", () => {
    const url = buildCloudLoggingUrl({
      projectId: "my-project",
      workloadRunId: "run-1",
    });

    expect(url).toBe(
      "https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22%0AjsonPayload.workloadRunId%3D%22run-1%22?project=my-project",
    );
  });
});
