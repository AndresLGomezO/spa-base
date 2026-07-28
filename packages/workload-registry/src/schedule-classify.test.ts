import { describe, expect, it } from "vitest";

import {
  classifyCron,
  classifyWorkloadSchedule,
  formatScheduleClock,
  inferWorkloadDomain,
} from "./schedule-classify.js";

describe("classifyCron", () => {
  it("classifies every-minute", () => {
    expect(classifyCron("* * * * *")).toEqual({
      frequency: "everyMinute",
      minuteOfDay: null,
      hour: null,
    });
  });

  it("classifies every N minutes", () => {
    expect(classifyCron("*/5 * * * *").frequency).toBe("everyNMinutes");
  });

  it("classifies hourly", () => {
    expect(classifyCron("15 * * * *").frequency).toBe("hourly");
  });

  it("classifies daily with clock", () => {
    expect(classifyCron("0 21 * * *")).toEqual({
      frequency: "daily",
      minuteOfDay: 21 * 60,
      hour: 21,
    });
    expect(formatScheduleClock(21 * 60)).toBe("21:00");
  });

  it("classifies weekly and monthly", () => {
    expect(classifyCron("0 6 * * 1").frequency).toBe("weekly");
    expect(classifyCron("0 0 1 * *").frequency).toBe("monthly");
  });

  it("returns onDemand when no schedule", () => {
    expect(classifyWorkloadSchedule(undefined).frequency).toBe("onDemand");
  });
});

describe("inferWorkloadDomain", () => {
  it("infers email and ai", () => {
    expect(inferWorkloadDomain({ entity: "emailMessage" })).toBe("email");
    expect(inferWorkloadDomain({ name: "Nightly AI insights" })).toBe("ai");
    expect(inferWorkloadDomain({ name: "Cleanup" })).toBe("platform");
  });
});
