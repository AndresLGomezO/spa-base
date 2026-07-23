import { describe, expect, it } from "vitest";

import type { IndexProvisioningJob } from "../../lib/api-client";
import {
  indexJobLastActivityAt,
  indexJobMatchesTimeBounds,
} from "./index-provisioning-time-filter";

function job(
  partial: Partial<IndexProvisioningJob> &
    Pick<IndexProvisioningJob, "phase" | "log">,
): IndexProvisioningJob {
  return {
    signature: "sig",
    collection: "items",
    requiresManualAction: false,
    ...partial,
  };
}

describe("index-provisioning-time-filter", () => {
  it("uses the newest log timestamp as last activity", () => {
    expect(
      indexJobLastActivityAt(
        job({
          phase: "ready",
          log: [
            {
              timestamp: "2026-07-23T10:00:00.000Z",
              level: "info",
              event: "start",
              message: "start",
            },
            {
              timestamp: "2026-07-23T12:00:00.000Z",
              level: "success",
              event: "ready",
              message: "ready",
            },
          ],
        }),
      ),
    ).toBe("2026-07-23T12:00:00.000Z");
  });

  it("keeps in-flight jobs without timestamps", () => {
    expect(
      indexJobMatchesTimeBounds(job({ phase: "creating", log: [] }), {
        sinceIso: "2026-07-23T11:00:00.000Z",
        untilIso: "2026-07-23T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      indexJobMatchesTimeBounds(job({ phase: "ready", log: [] }), {
        sinceIso: "2026-07-23T11:00:00.000Z",
        untilIso: "2026-07-23T12:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("filters by activity window", () => {
    const ready = job({
      phase: "ready",
      log: [
        {
          timestamp: "2026-07-23T10:00:00.000Z",
          level: "success",
          event: "ready",
          message: "ready",
        },
      ],
    });
    expect(
      indexJobMatchesTimeBounds(ready, {
        sinceIso: "2026-07-23T11:00:00.000Z",
        untilIso: "2026-07-23T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      indexJobMatchesTimeBounds(ready, {
        sinceIso: "2026-07-23T09:00:00.000Z",
        untilIso: "2026-07-23T12:00:00.000Z",
      }),
    ).toBe(true);
  });
});
